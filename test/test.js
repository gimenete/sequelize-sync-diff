var assert = require('assert')
var Sequelize = require('sequelize')
var dedent = require('dedent')
require('../')(Sequelize)

describe('syncDiff()', function() {

  it('should work', function() {
    var sequelize = new Sequelize('postgres://aro:aro@localhost/sync_diff1', {})
    var User = sequelize.define('User', {
      'name': Sequelize.STRING,
    })
    var Project = sequelize.define('Project', {
      'name': Sequelize.STRING,
    })
    return sequelize
      .sync({ force: true })
      .then(function() {
        // modify schema
        Project.hasOne(User)
        // diff
        return sequelize.syncDiff('postgres://aro:aro@localhost/sync_diff2')
      })
      .then(function(sql) {
        assert.equal(sql, dedent`
          ALTER TABLE "public"."Users" ADD COLUMN "ProjectId" integer NULL;

          ALTER TABLE "public"."Users" ADD CONSTRAINT "Users_ProjectId_fkey" FOREIGN KEY (""ProjectId"") REFERENCES ""Projects"" ("id");
        `)
      })
  })

})
