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

  Sequelize.prototype.syncDiff = function(database, username, password, options) {
    var self = this
    var sequelize = new Sequelize(database, username, password, options || this.options)
    this.diff_actions.forEach(function(action) {
      if (!action.model) {
        sequelize[action.method].apply(sequelize, action.args)
      } else {
        var model = sequelize.model(action.model)
        action.args[0] = sequelize.model(action.args[0].name)
        model[action.method].apply(model, action.args)
      }
    })

    return self.sync()
      .then(function() {
        return sequelize.sync({ force: true })
      })
      .then(function() {
        var arr = []
        dbdiff.logger = function(msg) {
          arr.push(msg)
        }
        var masterConfig = {
          host: self.config.host,
          port: self.config.port,
          user: self.config.username,
          password: self.config.password,
          database: self.config.database,
          ssl: self.config.ssl
        };
        var dummyConfig = {
          host: options.host,
          port: options.port,
          user: username,
          password: password,
          database: database,
          ssl: options.ssl
        };
        return new Promise(function (resolve, reject) {
          dbdiff.compareDatabases(masterConfig, dummyConfig, function(err) {
            err ? reject(err) : resolve(arr.join('\n'))
          })
        })
      })
  }
}
