# sequelize-sync-diff

Uses `Sequelize.sync()` but generates ALTER statements instead of DROP+CREATE.

**Only works for postgres right now**. Please open an issue if you need support for other databases.

## How it works

`sequelize-sync-diff` syncs your schema with your database using `sequelize.sync({ force: false })` and you need to provide a _dummy_ database where it will recreate the same schema you have and will call `.sync()` but this time with `{ force: true }`. So at this point you have your working database not fully up to date since `sync()` has its limitations but you have a _dummy_ empty database but with the full schema your data models need. Then, internally, [https://github.com/gimenete/dbdiff](dbdiff) is used to compare both databases and you get the SQL required to execute in your working database to be up to date with your data model changes.

## Installing

```
npm install sequelize-sync-diff
```

## Usage

```javascript
// Before defining anything in your data model you need this code:
var Sequelize = require('sequelize')
require('sequelize-sync-diff')(Sequelize)
// At this point Sequelize has the new syncDiff() method injected
// and some code has been injected for introspecting the data model


// Use Sequelize as you always do
var sequelize = new Sequelize('postgres://user:pass@localhost/database', {})

var User = sequelize.define('User', {/* ... */})
var Project = sequelize.define('Project', {/* ... */})
Project.hasOne(User)

// Now is time to use .syncDiff()
sequelize
  .syncDiff('postgres://aro:aro@localhost/database_dummy')
  .then(function(sql) {
    // Here we have the ALTER statemetns
    console.log(sql)
  })
```

## Caveats

The SQL statements are returned to you and they are not executed for a good reason: there are scenarios on which this will cause data loss (e.g. dropping a column). Also some statements could fail depending on the data you have in your working database (e.g. changing the data type of a column or setting it to NOT NULL). For more information please check [dbdiff caveats](https://github.com/gimenete/dbdiff#caveats).
