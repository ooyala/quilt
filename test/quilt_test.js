var quilt = process.env.QUILT_COV ?
             require("../lib-cov/quilt.js") :
             require("../lib/quilt.js");
var Quilt = quilt.Quilt;
var expect = require("expect.js");
var exec = require("child_process").exec;
var http = require("http");
var url = require("url");
var fs = require("fs");

var noop = function(){};

describe('quilt', function() {
  before(function() {
  });

  after(function() {
  });

  describe('create', function() {
    before(function() {
    });

    after(function() {
    });

    it('should be a function', function() {
      expect(quilt.create).to.be.a('function');
    });

    it('should throw an exception if no config hash is specified', function() {
      var error = null;
      try {
        var myQuilt = quilt.create(null, noop, noop);
      } catch (err) {
        error = err;
      }
      expect(error).not.to.be(null);
    });

    it('should throw an exception if no local_path is specified', function() {
      var error = null;
      try {
        var myQuilt = quilt.create({}, noop, noop);
      } catch (err) {
        error = err;
      }
      expect(error).not.to.be(null);
    });

    it('should create a quilt', function() {
      var error = null;
      try {
        var myQuilt = quilt.create({ "local_path" : __dirname + "/fake_project" }, noop, noop);
        expect(myQuilt).to.be.an('object');
        expect(myQuilt.stitch).to.be.a('function');
      } catch (err) {
        error = err;
      }
      expect(error).to.be(null);
    });
  });

  describe('instance functions', function() {
    var myQuilt = null;
    var myNoRemoteQuilt = null;
    var myBadRemoteQuilt = null;
    var server = null;
    before(function() {
      // fake server for remote requests
      server = http.createServer(function(request, response) {
        var parsed = url.parse(request.url);
        var pathname = parsed.pathname;
        var fileContents = null;
        try {
          fileContents = fs.readFileSync(__dirname + "/fake_server" + pathname);
        } catch(err) {
          response.writeHead(404, {'Content-Type': 'application/octet-stream'});
          response.end('');
          return;
        }
        response.writeHead(200, {'Content-Type': 'application/octet-stream'});
        response.end(fileContents);
      }).listen(1337);

      // remote enabled quilt
      myQuilt = quilt.create({
        "local_path" : __dirname + "/fake_project",
        "remote_host" : "localhost",
        "remote_port" : 1337,
        "remote_path" : "/"
      }, noop, noop);

      // bad remote enabled quilt
      myBadRemoteQuilt = quilt.create({
        "local_path" : __dirname + "/fake_project",
        "remote_host" : "localhost",
        "remote_port" : 1338,
        "remote_path" : "/"
      }, noop, noop);

      // local only quilt
      myNoRemoteQuilt = quilt.create({ "local_path" : __dirname + "/fake_project" }, noop, noop);
    });

    after(function() {
      server.close();
    });

    describe('moduleNameFromFileName', function() {
      before(function() {
      });

      after(function() {
      });

      it('should be a function', function() {
        expect(Quilt.moduleNameFromFileName).to.be.a('function');
      });

      it('should return null for bad file names', function() {
        var name = Quilt.moduleNameFromFileName();
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName(null);
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName(undefined);
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("hello");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("/hello");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("./hello");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("hello/hello");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("/hello/hello");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("./hello/hello");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("hello.json");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("/hello.json");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("./hello.json");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("hello/hello.json");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("/hello/hello.json");
        expect(name).to.be(null);
        name = Quilt.moduleNameFromFileName("./hello/hello.json");
        expect(name).to.be(null);
      });

      it('should return a valid name for good file names', function() {
        var name = Quilt.moduleNameFromFileName("hello.js");
        expect(name).to.be("hello");
        name = Quilt.moduleNameFromFileName("/hello.js");
        expect(name).to.be("hello");
        name = Quilt.moduleNameFromFileName("./hello.js");
        expect(name).to.be("hello");
        name = Quilt.moduleNameFromFileName("hello/hello.js");
        expect(name).to.be("hello");
        name = Quilt.moduleNameFromFileName("/hello/hello.js");
        expect(name).to.be("hello");
        name = Quilt.moduleNameFromFileName("./hello/hello.js");
        expect(name).to.be("hello");
      });
    });

    describe('moduleFromConfigHash', function() {
      before(function() {
      });

      after(function() {
      });

      it('should be a function', function() {
        expect(Quilt.moduleFromConfigHash).to.be.a('function');
      });

      it('should return null if the module does not exist', function() {
        var module = Quilt.moduleFromConfigHash("randomjunk", [], "morerandomjunk");
        expect(module).to.be(null);
      });

      it('should return the module if the module does exist', function() {
        var module = Quilt.moduleFromConfigHash("optional/0.js", ["1"], __dirname + "/fake_project/1.0.0/");
        expect(module).not.to.be(null);
        expect(module.dependancies).to.eql(["1"]);
        expect(module.module).to.be("0\n");
      });

      it('should handle relative and non-relative filenames', function() {
        var module = Quilt.moduleFromConfigHash("optional/0.js", [], __dirname + "/fake_project/1.0.0/");
        expect(module).not.to.be(null);
        module = Quilt.moduleFromConfigHash("1.js", [], __dirname + "/fake_project/1.0.0/");
        expect(module).not.to.be(null);
        module = Quilt.moduleFromConfigHash("./optional/0.js", [], __dirname + "/fake_project/1.0.0/");
        expect(module).not.to.be(null);
        module = Quilt.moduleFromConfigHash("./1.js", [], __dirname + "/fake_project/1.0.0/");
        expect(module).not.to.be(null);
      });

      it('should handle a single dependancy as a string', function() {
        var module = Quilt.moduleFromConfigHash("optional/0.js", "1", __dirname + "/fake_project/1.0.0/");
        expect(module).not.to.be(null);
        expect(module.dependancies).to.eql(["1"]);
        expect(module.module).to.be("0\n");
      });
    });

    describe('loadVersion', function() {
      before(function() {
      });

      after(function() {
      });

      it('should be a function', function() {
        expect(Quilt.loadVersion).to.be.a('function');
      });

      it('should return null if there is no manifest', function() {
        var version = Quilt.loadVersion(__dirname, "fake_project");
        expect(version).to.be(null);
      })

      it('should return a version', function() {
        var version = Quilt.loadVersion(__dirname + "/fake_project", "1.0.0");
        expect(version).not.to.be(null);
        expect(version.manifest).not.to.be(null);
        expect(version.base).to.be("h\nc\n");
        expect(version.modules).to.eql({
          "0" : { "dependancies" : [ "8" ], "module" : "0\n" },
          "1" : { "dependancies" : [ "7", "9" ], "module" : "1\n" },
          "2" : { "dependancies" : [ "8" ], "module" : "2\n" },
          "3" : { "dependancies" : [], "module" : "3\n" },
          "4" : { "dependancies" : [], "module" : "4\n" },
          "5" : { "dependancies" : [], "module" : "5\n" },
          "6" : { "dependancies" : [], "module" : "6\n" },
          "7" : { "dependancies" : [], "module" : "7\n" },
          "8" : { "dependancies" : [], "module" : "8\n" },
          "9" : { "dependancies" : [], "module" : "9\n" },
        });
        expect(version.footer).to.be("f1.0.0\n");
      });

      it('should gracefully handle a bad manifest entries', function() {
        var version = Quilt.loadVersion(__dirname + "/bad_project", "1.0.0");
        expect(version).not.to.be(null);
        expect(version.manifest).not.to.be(null);
        expect(version.base).to.be("c\n");
        expect(version.modules).to.eql({
          "0" : { "dependancies" : [ "8" ], "module" : "0\n" },
          "1" : { "dependancies" : [ "7", "9" ], "module" : "1\n" },
          "2" : { "dependancies" : [ "8" ], "module" : "2\n" },
          "3" : { "dependancies" : [], "module" : "3\n" },
          "4" : { "dependancies" : [], "module" : "4\n" },
          "5" : { "dependancies" : [], "module" : "5\n" },
          "6" : { "dependancies" : [], "module" : "6\n" },
          "7" : { "dependancies" : [], "module" : "7\n" },
          "8" : { "dependancies" : [], "module" : "8\n" },
          "9" : { "dependancies" : [], "module" : "9\n" },
        });
        expect(version.footer).to.be(null);
      });
    });

    describe('resolveDependancies', function() {
      var version = null;
      before(function() {
        version = {
          "manifest" : {},
          "base" : "h\nc\n",
          "modules" : {
            "0" : { "dependancies" : [ "8" ], "module" : "0\n" },
            "1" : { "dependancies" : [ "7", "9" ], "module" : "1\n" },
            "2" : { "dependancies" : [ "8" ], "module" : "2\n" },
            "3" : { "dependancies" : [], "module" : "3\n" },
            "4" : { "dependancies" : [], "module" : "4\n" },
            "5" : { "dependancies" : [ "6" ], "module" : "5\n" },
            "6" : { "dependancies" : [ "5" ], "module" : "6\n" },
            "7" : { "dependancies" : [], "module" : "7\n" },
            "8" : { "dependancies" : [ "9" ], "module" : "8\n" },
            "9" : { "dependancies" : [], "module" : "9\n" },
          }
        }
      });

      after(function() {
      });

      it('should be a function', function() {
        expect(myQuilt.resolveDependancies).to.be.a('function');
      });

      it('should return an empty string for no modules', function() {
        var out = myQuilt.resolveDependancies(null, version);
        expect(out).to.be('');
        out = myQuilt.resolveDependancies(undefined, version);
        expect(out).to.be('');
        out = myQuilt.resolveDependancies([], version);
        expect(out).to.be('');
        out = myQuilt.resolveDependancies({ "yo" : "sup" }, version);
        expect(out).to.be('');
        out = myQuilt.resolveDependancies("hello", version);
        expect(out).to.be('');
      });

      it('should resolve dependancies', function() {
        var out = myQuilt.resolveDependancies([ "0", "1", "2" ], version);
        expect(out).to.be('9\n8\n0\n7\n1\n2\n');
      });

      it('should gracefully handle circular dependancies', function() {
        var out = myQuilt.resolveDependancies([ "5" ], version);
        expect(out).to.be('6\n5\n');
      });

      it('should gracefully handle non-existant modules', function() {
        var out = myQuilt.resolveDependancies([ "5", "oogabooga" ], version);
        expect(out).to.be('6\n5\n');
      });
    });

    describe('getVersion', function() {
      before(function() {
      });

      after(function() {
      });

      it('should be a function', function() {
        expect(myQuilt.getVersion).to.be.a('function');
      });

      it('should return null for a non-existant version when no remote information exists', function() {
        var version = {};
        myNoRemoteQuilt.getVersion('2.0.0', function(theVersion) {
          version = theVersion;
        });
        expect(version).to.be(null);
      });

      it('should return version if it exists', function(done) {
        var version = {};
        myNoRemoteQuilt.getVersion('1.0.0', function(theVersion) {
          version = theVersion;
          expect(version).not.to.be(null);
          expect(version.manifest).not.to.be(null);
          expect(version.base).to.be("h\nc\n");
          expect(version.modules).to.eql({
            "0" : { "dependancies" : [ "8" ], "module" : "0\n" },
            "1" : { "dependancies" : [ "7", "9" ], "module" : "1\n" },
            "2" : { "dependancies" : [ "8" ], "module" : "2\n" },
            "3" : { "dependancies" : [], "module" : "3\n" },
            "4" : { "dependancies" : [], "module" : "4\n" },
            "5" : { "dependancies" : [], "module" : "5\n" },
            "6" : { "dependancies" : [], "module" : "6\n" },
            "7" : { "dependancies" : [], "module" : "7\n" },
            "8" : { "dependancies" : [], "module" : "8\n" },
            "9" : { "dependancies" : [], "module" : "9\n" },
          });
          expect(version.footer).to.be("f1.0.0\n");
          done();
        });
      });

      it('should fetch remote version if it does not exist locally', function(done) {
        var version = {};
        myQuilt.getVersion('2.0.0', function(theVersion) {
          version = theVersion;
          expect(version).not.to.be(null);
          expect(version.manifest).not.to.be(null);
          expect(version.base).to.be("h\nc\n");
          expect(version.modules).to.eql({
            "0" : { "dependancies" : [ "8" ], "module" : "0\n" },
            "1" : { "dependancies" : [ "7", "9" ], "module" : "1\n" },
            "2" : { "dependancies" : [ "8" ], "module" : "2\n" },
            "3" : { "dependancies" : [], "module" : "3\n" },
            "4" : { "dependancies" : [], "module" : "4\n" },
            "5" : { "dependancies" : [], "module" : "5\n" },
            "6" : { "dependancies" : [], "module" : "6\n" },
            "7" : { "dependancies" : [], "module" : "7\n" },
            "8" : { "dependancies" : [], "module" : "8\n" },
            "9" : { "dependancies" : [], "module" : "9\n" },
          });
          expect(version.footer).to.be("f2.0.0\n");
          exec("rm -rf "+__dirname+"/fake_project/2.0.0", function(e, stdo, stde){});
          done();
        });
      });

      it("should return null if version doesn't exist locally or remote", function(done) {
        var version = {};
        myQuilt.getVersion('3.0.0', function(theVersion) {
          expect(theVersion).to.be(null);
          done();
        });
      });

      it("should return null if remote version file is empty", function(done) {
        var version = {};
        myQuilt.getVersion('empty', function(theVersion) {
          expect(theVersion).to.be(null);
          done();
        });
      });

      it("should return null if remote version file is not a gzipped tar", function(done) {
        var version = {};
        myQuilt.getVersion('bad', function(theVersion) {
          expect(theVersion).to.be(null);
          done();
        });
      });

      it("should return null if remote server doesn't exist", function(done) {
        var version = {};
        myBadRemoteQuilt.getVersion('something', function(theVersion) {
          expect(theVersion).to.be(null);
          done();
        });
      });
    });

    describe('stitch', function() {
      before(function() {
      });

      after(function() {
      });

      it('should be a function', function(done) {
        expect(myQuilt.stitch).to.be.a('function');
        done();
      });

      it('should return empty for a non-existant version when no remote information exists', function(done) {
        myNoRemoteQuilt.stitch(["0"], "2.0.0", function(stitched, error) {
          expect(stitched).to.be('');
          expect(error).not.to.be(null);
          done();
        });
      });

      it('should properly stitch for an existing version with selector array', function(done) {
        myNoRemoteQuilt.stitch(["0"], "1.0.0", function(stitched, error) {
          expect(stitched).to.be('h\nc\n8\n0\nf1.0.0\n');
          expect(error).to.be(null);
          done();
        });
      });

      it('should properly stitch for an existing version with selector function', function(done) {
        myNoRemoteQuilt.stitch(function() { return true; }, "1.0.0", function(stitched, error) {
          expect(stitched).to.be('h\nc\n8\n0\n7\n9\n1\n2\n3\n4\n5\n6\nf1.0.0\n');
          expect(error).to.be(null);
          done();
        });
      });

      it('should properly stitch for remote version with selector array', function(done) {
        myQuilt.stitch(["0"], "2.0.0", function(stitched, error) {
          expect(stitched).to.be('h\nc\n8\n0\nf2.0.0\n');
          expect(error).to.be(null);
          exec("rm -rf "+__dirname+"/fake_project/2.0.0", function(e, stdo, stde){});
          done();
        });
      });

      it('should properly stitch for remote version with selector function', function(done) {
        myQuilt.stitch(function() { return true; }, "2.0.0", function(stitched, error) {
          expect(stitched).to.be('h\nc\n8\n0\n7\n9\n1\n2\n3\n4\n5\n6\nf2.0.0\n');
          expect(error).to.be(null);
          exec("rm -rf "+__dirname+"/fake_project/2.0.0", function(e, stdo, stde){});
          done();
        });
      });
    });
  });
});
