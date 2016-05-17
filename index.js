var dbdiff = require('dbdiff')

module.exports = function(Sequelize) {
  if (Sequelize.prototype.syncDiff) return

  var sequelizeMethods = ['define']
  var modelMethods = ['belongsTo', 'hasOne', 'hasMany', 'belongsToMany']

  sequelizeMethods.forEach(function(name) {
    var func = Sequelize.prototype[name]
    Sequelize.prototype[name] = function() {
      var args = Array.prototype.slice.call(arguments)
      this.diff_actions = this.diff_actions || []
      this.diff_actions.push({ method: name, args: args })
      return func.apply(this, args)
    }
  })

  modelMethods.forEach(function(name) {
    var func = Sequelize.Model.prototype[name]
    Sequelize.Model.prototype[name] = function() {
      var args = Array.prototype.slice.call(arguments)
      var sequelize = this.sequelize
      sequelize.diff_actions = sequelize.diff_actions || []
      sequelize.diff_actions.push({ method: name, args: args, model: this.name })
      return func.apply(this, args)
    }
  })

  Sequelize.prototype.syncDiff = function(url, options) {
    var self = this
    var sequelize = new Sequelize(url, options || this.options)
    this.diff_actions.forEach(function(action) {
      if (!action.model) {
        sequelize[action.method].apply(sequelize, action.args)
      } else {
        var model = sequelize.model(action.model)
        action.args[0] = sequelize.model(action.args[0].name)
        model[action.method].apply(model, action.args)
      }
    })

    var selfOptions = {
      dialect: self.options.dialect,
      username: self.config.username,
      password: self.config.password,
      database: self.config.database,
      host: self.config.host,
      dialectOptions: self.config.dialectOptions
    }
    var diff = new dbdiff.DbDiff()
    return sequelize.sync({ force: true })
      .then(function() {
        return diff.compare(selfOptions, url)
      })
      .then(function() {
        return diff.commands('drop')
      })
  }
}
