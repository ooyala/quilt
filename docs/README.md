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
