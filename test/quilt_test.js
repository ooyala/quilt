var quilt = require("../lib/quilt.js");
var expect = require("expect.js");

describe('quilt', function() {
  before(function() {
  });

  after(function() {
  });

  describe('fake test', function() {
    it('should work', function() {
      expect(quilt.create).to.be.a('function');
    });
  });
});
