var _ = require('underscore');
var fs = require("fs");
var http = require("http");
var exec = require('child_process').exec;

var Quilt = (function() {
  function Quilt(config) {
    this.config = config;
    this.versions = {};

    if (_.isString(config.local_path)) {
      var me = this;
      fs.readdirSync(config.local_path).forEach(function(versionDir) {
        me.versions[versionDir] = Quilt.loadVersion(config.local_path, versionDir);
      });
    }
  };

  Quilt.moduleFromConfigHash = function(moduleHash, moduleName, versionDir) {
    var tmpModule = {};
    tmpModule.priority = _.isNumber(moduleHash.priority) ? moduleHash.priority : 0;
    tmpModule.dependancies = _.isArray(moduleHash.dependancies) ? moduleHash.dependancies :
                                                                  _.isString(moduleHash.dependancies) ?
                                                                    [ moduleHash.dependancies ] :
                                                                    [];
    try {
      tmpModule.module = fs.readFileSync(versionDir+moduleHash.file).toString();
    } catch (err) {
      console.error(  "ERROR: could not load module: "+moduleHash.file);
      console.error(err);
      return null;
    }
    return tmpModule;
  };

  Quilt.loadVersion = function(local_path, loadVersionName) {
    console.log("Loading Version: "+loadVersionName);
    var i;
    var newVersion = {};
    var manifest = {};
    newVersion.name = loadVersionName;
    newVersion.dir = local_path + '/' + loadVersionName + '/';;
    try {
      manifest = require(newVersion.dir + 'manifest.js');
    } catch (err) {
      console.error("  ERROR: no manifest!");
      console.error(err);
      return null;
    }
    /*
      manifest.js:
      module.exports = {
        "header" : "<header file>",
        "footer" : "<footer file>",
        "common" : {
          "<module name>" : {
            "file" : "<module file>",
            "dependancies" : [ "<dependancy module name>", ... ],
            "priority" : <number>
          }
        },
        "optional" : {
          "<module name>" : {
            "file" : "<module file>",
            "dependancies" : [ "<dependancy module name>", ... ],
            "priority" : <number>
          }
        }
      };
    */
    var tmpModule = "";
    if (_.isString(manifest.header)) {
      try {
        newVersion.header = fs.readFileSync(newVersion.dir+manifest.header).toString();
      } catch (err) {
        console.error(  "ERROR: could not load header: "+manifest.header);
        console.error(err);
        newVersion.header = null;
      }
    }
    newVersion.common = [];
    newVersion.modules = {};
    _.each(manifest.common, function(moduleHash, moduleName) {
      tmpModule = Quilt.moduleFromConfigHash(moduleHash, moduleName, newVersion.dir);
      if (tmpModule !== null) {
        newVersion.common.push(moduleName);
        newVersion.modules[moduleName] = tmpModule;
      }
    });
    newVersion.optional = [];
    _.each(manifest.optional, function(moduleHash, moduleName) {
      tmpModule = Quilt.moduleFromConfigHash(moduleHash, moduleName, newVersion.dir);
      if (tmpModule !== null) {
        newVersion.optional.push(moduleName);
        newVersion.modules[moduleName] = tmpModule;
      }
    });
    if (_.isString(manifest.footer)) {
      try {
        newVersion.footer = fs.readFileSync(newVersion.dir+manifest.footer).toString();
      } catch (err) {
        console.error(  "ERROR: could not load footer: "+manifest.footer);
        console.error(err);
        newVersion.footer = null;
      }
    }
    return newVersion;
  };

  Quilt.prototype.stitch = function(selector, stitchVersionName, stitchCallback) {
    this.getVersion(stitchVersionName, function(version) {
      if (version === null) { stitchCallback(''); return; }

      // get the modules we want to use
      var modules = [];
      if (_.isFunction(selector)) {
        modules = _.filter(version.optional, selector);
      } else if (_.isArray(selector)) {
        modules = selector;
      }
      modules = _.union(modules, version.common);

      // build list of modules to use
      var allModules = {};
      _.each(modules, function(moduleName) {
        allModules[moduleName] = true;
        if (_.isObject(version.modules[moduleName])) {
          _.each(version.modules[moduleName].dependancies, function(dependancyName) {
            allModules[dependancyName] = true;
          });
        }
      });

      // sort list by priority
      modules = _.sortBy(_.keys(allModules), function(moduleName) {
        return version.modules[moduleName].priority;
      });

      // include modules
      var output = '';
      if (_.isString(version.header)) { output += version.header; }
      _.each(modules, function(moduleName) {
        output += (_.isString(version.modules[moduleName].module) ? version.modules[moduleName].module : '');
      });
      if (_.isString(version.footer)) { output += version.footer; }
      stitchCallback(output);
    });
  };

  Quilt.prototype.getVersion = function(getVersionName, getVersionCallback) {
    if (_.isObject(this.versions[getVersionName])) { getVersionCallback(this.versions[getVersionName]); return; }
    // Fetch the version
    var filename = getVersionName+'.tgz';
    var me = this;
    http.get({
      host : this.config.remote_host,
      path : this.config.remote_path+'/'+filename
    }, function(response) {
      response.setEncoding('binary');
      var body = '';
      response.on('data', function(chunk) { body += chunk; });
      response.on('end', function() {
        fs.writeFileSync(me.config.local_path+'/'+filename, body, 'binary');
        // Untar the version
        exec('cd '+me.config.local_path+'/'+'; tar -xzf '+filename+'; rm '+filename,
             function(error, stdout, stderr) {
          if (_.isObject(error)) { getVersionCallback(null); return; }
          // Load the version
          me.versions[getVersionName] = Quilt.loadVersion(me.config.local_path, getVersionName);
          getVersionCallback(me.versions[getVersionName]);
        });
      });
    });
  };

  return Quilt;
})();

exports.create = function(config) {
  return new Quilt(config);
}
