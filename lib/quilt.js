var _ = require('underscore');
var fs = require("fs");
var http = require("http");
var exec = require('child_process').exec;

var Quilt = (function() {
  /*
    config:
    {
      "remote_host" : "<remote hostname or null>",
      "remote_port" : "<remote port or null>",
      "remote_path" : "<remote path or null>",
      "local_path" : "<local path>",
    }
  */
  function Quilt(config, err, dbg) {
    if (!_.isObject(config)) {
      throw "Quilt: config hash not specified";
    }
    this.config = config;
    this.versions = {};
    this.log = {};
    Quilt.log.err = err ? err : Quilt.log.err;
    Quilt.log.dbg = dbg ? dbg : Quilt.log.dbg;

    if (_.isString(config.local_path)) {
      var me = this;
      fs.readdirSync(config.local_path).forEach(function(versionDir) {
        me.versions[versionDir] = Quilt.loadVersion(config.local_path, versionDir);
      });
    } else {
      throw "Quilt: local path not specified";
    }
  };

  Quilt.log = {};
  Quilt.log.err = console.error;
  Quilt.log.dbg = console.log;

  Quilt.moduleNameFromFileName = function(moduleFile) {
    if (!_.isString(moduleFile)) { return null; }
    var matches = moduleFile.match(/(^.*\/|^)(.*)\.js$/);
    if (!_.isArray(matches) || matches.length < 3) { return null; }
    return matches[2];
  };

  Quilt.moduleFromConfigHash = function(moduleFile, dependancies, versionDir) {
    var tmpModule = {};
    tmpModule.dependancies = _.isArray(dependancies) ? dependancies : _.isString(dependancies) ?
                                                                        [ dependancies ] :
                                                                        [];
    try {
      tmpModule.module = fs.readFileSync(versionDir+moduleFile).toString();
    } catch (err) {
      Quilt.log.err("  ERROR: could not load module: "+moduleFile);
      Quilt.log.err(err);
      return null;
    }
    return tmpModule;
  };

  Quilt.loadVersion = function(local_path, loadVersionName) {
    Quilt.log.dbg("Loading Version: "+loadVersionName);
    var i;
    var manifest = {};
    var tmpModule = null;
    var tmpModuleName = null;
    var newVersion = {};
    newVersion.name = loadVersionName;
    newVersion.dir = local_path + '/' + loadVersionName + '/';;
    newVersion.base = "";
    newVersion.modules = {};
    try {
      manifest = require(newVersion.dir + 'manifest.js');
    } catch (err) {
      Quilt.log.err("  ERROR: no manifest!");
      Quilt.log.err(err);
      return null;
    }
    /*
      manifest.js:
      module.exports = {
        "header" : "<header file>",
        "footer" : "<footer file>",
        "common" : [
          "<module file>",
          ...
        ],
        "optional" : {
          "<module file>" : [ "<dependancy module name>", ... ],
          ...
        }
      };
    */
    if (_.isString(manifest.header)) {
      try {
        newVersion.base += fs.readFileSync(newVersion.dir+manifest.header).toString();
      } catch (err) {
        Quilt.log.err("  ERROR: could not load header: "+manifest.header);
        Quilt.log.err(err);
      }
    }
    _.each(manifest.common, function(moduleFile) {
      try {
        newVersion.base += fs.readFileSync(newVersion.dir+moduleFile).toString();
      } catch (err) {
        Quilt.log.err("  ERROR: could not load common module: "+moduleFile);
        Quilt.log.err(err);
      }
    });
    _.each(manifest.optional, function(dependancies, moduleFile) {
      tmpModule = Quilt.moduleFromConfigHash(moduleFile, dependancies, newVersion.dir);
      if (tmpModule !== null) {
        tmpModuleName = Quilt.moduleNameFromFileName(moduleFile);
        if (tmpModuleName !== null) {
          newVersion.modules[tmpModuleName] = tmpModule;
        } else {
          Quilt.log.err("  ERROR: could not extract module name from: "+moduleFile);
        }
      }
    });
    if (_.isString(manifest.footer)) {
      try {
        newVersion.footer = fs.readFileSync(newVersion.dir+manifest.footer).toString();
      } catch (err) {
        Quilt.log.err("  ERROR: could not load footer: "+manifest.footer);
        Quilt.log.err(err);
        newVersion.footer = null;
      }
    }
    return newVersion;
  };

  Quilt.prototype.resolveDependancies = function(modules, version, allModules) {
    var out = '';
    var me = this;
    if (!_.isArray(modules) || _.isEmpty(modules)) {
      return out;
    }
    var myAllModules = allModules;
    if (!_.isObject(allModules)) {
      myAllModules = {};
    }
    _.each(modules, function(moduleName) {
      if (myAllModules[moduleName] === 2) { return; }
      if (!_.isObject(version.modules[moduleName]) || !_.isString(version.modules[moduleName].module)) {
        Quilt.log.err("  ERROR: invalid module: "+moduleName);
        myAllModules[moduleName] === 2;
        return;
      }
      if (myAllModules[moduleName] === 1) {
        Quilt.log.err("  ERROR: circular module dependancy: "+moduleName);
        return;
      }
      myAllModules[moduleName] = 1;
      out += me.resolveDependancies(version.modules[moduleName].dependancies, version, myAllModules);
      out += version.modules[moduleName].module;
      myAllModules[moduleName] = 2;
    });
    return out;
  }

  Quilt.prototype.getVersion = function(getVersionName, getVersionCallback) {
    var fail = function(msg, error) {
      Quilt.log.err("  ERROR: "+msg);
      if (error) { Quilt.log.err(error); }
      if (_.isFunction(getVersionCallback)) { getVersionCallback(null); }
    };
    if (_.isObject(this.versions[getVersionName])) {
      if (_.isFunction(getVersionCallback)) { getVersionCallback(this.versions[getVersionName]); }
      return;
    }
    if (!_.isString(this.config.remote_host) || !_.isString(this.config.remote_path)) {
      fail("unable to load from host: " + this.config.remote_host + ", path: " + this.config.remote_path);
      return;
    }
    // Fetch the version
    var filename = getVersionName+'.tgz';
    var me = this;
    http.get({
      host : this.config.remote_host,
      path : this.config.remote_path+'/'+filename,
      port : _.isNumber(this.config.remote_port) ? this.config.remote_port : 80
    }, function(response) {
      response.setEncoding('binary');
      var body = '';
      if(_.isNumber(response.statusCode) && response.statusCode !== 200) {
        fail("no version fetched");
        return;
      }
      response.on('data', function(chunk) { body += chunk; });
      response.on('end', function() {
        if(body === '' || response.statusCode !== 200) {
          fail("no version fetched");
          return;
        }
        fs.writeFileSync(me.config.local_path+'/'+filename, body, 'binary');
        // Untar the version
        var removeTgz = function() {
          exec('cd '+me.config.local_path+'/'+' && rm '+filename, function(error, stdout, stderr) {});
        }
        exec('cd '+me.config.local_path+'/'+' && tar -xzf '+filename,
             function(error, stdout, stderr) {
          if (_.isObject(error)) {
            fail("unable to untar package", error);
            removeTgz();
            return;
          }
          // Load the version
          me.versions[getVersionName] = Quilt.loadVersion(me.config.local_path, getVersionName);
          if (_.isFunction(getVersionCallback)) { getVersionCallback(me.versions[getVersionName]); }
          removeTgz();
        });
      });
    }).on('error', function(error) {
      fail("unable to connect to remote", error);
      return;
    });
  };

  Quilt.prototype.stitch = function(selector, stitchVersionName, stitchCallback) {
    var me = this;
    this.getVersion(stitchVersionName, function(version) {
      if (version === null) { stitchCallback('', 'Could not fetch version: '+stitchVersionName); return; }

      // get the modules we want to use
      var modules = [];
      if (_.isFunction(selector)) {
        modules = _.filter(_.keys(version.modules), selector);
      } else if (_.isArray(selector)) {
        modules = selector;
      }

      // resolve dependancies
      var allModules = {};
      _.each(modules, function(moduleName) {
        if (allModules[moduleName] === true) { return; }
        allModules[moduleName] = true;
        if (_.isObject(version.modules[moduleName])) {
          _.each(version.modules[moduleName].dependancies, function(dependancyName) {
            allModules[dependancyName] = true;
          });
        }
      });

      // include modules
      var output = version.base;
      output += me.resolveDependancies(modules, version, {});
      if (_.isString(version.footer)) { output += version.footer; }
      stitchCallback(output, null);
    });
  };

  return Quilt;
})();

exports.create = function(config, err, dbg) {
  return new Quilt(config, err, dbg);
}

if (process.env.QUILT_TEST) {
  exports.Quilt = Quilt;
}
