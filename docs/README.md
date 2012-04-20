# About Quilt #

Quilt is a simple way to stitch files together.

[github](http://github.com/ooyala/quilt)

# Installation #

    npm install quilt

# Usage #

    var config = {
      "local_path" : "<local path for versions>", // Required
      "remote_host" : "<remote host for fetching versions>", // Optional
      "remote_port" : "<remote port for fetching versions>", // Optional
      "remote_path" : "<base remote path for fetching versions>", // Optional
    };
    var quilt = require(quilt);
    var myQuilt = quilt.create(config);
    // selector = array of module names or selector function that takes a module name and returns true or
    //            false depending on whether or not to include the module
    // callback = function that takes two parameters:
    //              the stitched string
    //              the error if one exists, null if not
    myQuilt.stitch(selector, "<version number>", callback);

## Path Structure ##

### `local_path` ###

`local_path` should point to a directory contains the following directory structure for each version:

    <version name>/
    <version name>/manifest.js

`manifest.js` has the following format:

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

Where each `<module file>` will point to a module to stitch. The filename should be `<module name>.js`

The modules will be stitched in the following order:

    header
    common (in the order they were present in the array)
    optional (the only ordering that is guarenteed is: dependancies will be before their dependant modules)
    footer

Circular dependancies will be shortcircuited and an error message will be sent to `console.error`.

- - -

### `remote_path` ###

**Note:** This is optional.

`remote_host`, `remote_port`, and `remote_path` together should point to a server which contains version tarballs to download at the following path:

    http://remote_host:remote_portremote_path/<version name>.tgz

Note that `remote_path` must contain the leading slash and the version archive should be a gzipped tarball. The archive should contain the same directory structure as specified in the `local_path` section.
