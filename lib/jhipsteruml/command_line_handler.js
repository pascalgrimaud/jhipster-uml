'use strict';

const yargs = require('yargs'),
    DatabaseTypes = require('jhipster-core').JHipsterDatabaseTypes.Types,
    JHipsterBinaryOptionsValues = require('jhipster-core').JHipsterBinaryOptions.BINARY_OPTION_VALUES,
    values = require('../utils/object_utils').values;

module.exports = {
  argv: handle().argv
};

function handle() {
  return yargs
      .usage('Usage: jhipster-uml <xmi file> [-options]')
      .option({
        db: {
          describe: 'Defines which database type your app uses',
          choices: [DatabaseTypes.sql, DatabaseTypes.mongodb, DatabaseTypes.cassandra]
        },
        dto: {
          describe: 'Generates DTO',
          choices: values(JHipsterBinaryOptionsValues.dto)
        },
        paginate: {
          describe: 'Generates pagination',
          choices: values(JHipsterBinaryOptionsValues.pagination)
        },
        service: {
          describe: 'Generates services',
          choices: values(JHipsterBinaryOptionsValues.service)
        },
        'skip-client': {
          describe: 'Skips client code generation',
          nargs: 0
        },
        'skip-server': {
          describe: 'Skips server code generation',
          nargs: 0
        },
        'angular-suffix': {
          describe: 'Adds a suffix to angular files'
        },
        'microservice-name': {
          describe: 'Adds the microservice/s possessing the entity/ies'
        },
        'search-engine': {
          describe: 'Specifies the search engine',
          choices: values(JHipsterBinaryOptionsValues.searchEngine)
        },
        f: {
          alias: 'force',
          describe: 'Overrides entities',
          nargs: 0
        }
      })
      .help('h')
      .alias('h', 'help')
      .showHelpOnFail(false, 'See  -h/--help for available options')
      .detectLocale(false)
      .strict()
      .version(function() {
        return `The current version of JHipster UML is ${require('../../package.json').version}`;
      })
      .alias('version', 'v')
      .wrap(null);
}
