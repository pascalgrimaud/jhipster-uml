'use strict';

const _ = require('lodash'),
    AbstractParser = require('./abstract_parser'),
    parser_helper = require('./parser_helper'),
    cardinalities = require('../cardinalities'),
    checkForReservedClassName = require('../utils/jhipster_utils').checkForReservedClassName,
    checkForReservedTableName = require('../utils/jhipster_utils').checkForReservedTableName,
    checkForReservedFieldName = require('../utils/jhipster_utils').checkForReservedFieldName,
    buildException = require('../exceptions/exception_factory').buildException,
    exceptions = require('../exceptions/exception_factory').exceptions;

/**
 * The parser for UML Designer files.
 */
var UMLDesignerParser = module.exports = function (root, databaseTypes) {
  AbstractParser.call(this, root, databaseTypes);
};

UMLDesignerParser.prototype = Object.create(AbstractParser.prototype);
UMLDesignerParser.prototype.constructor = AbstractParser;

UMLDesignerParser.prototype.parse = function () {
  this.findElements();
  this.fillTypes();
  this.fillEnums();
  this.fillClassesAndFields();
  this.fillAssociations();
  return this.parsedData;
};

UMLDesignerParser.prototype.findElements = function () {
  this.root.packagedElement.forEach(function (element, index) {
    switch (element.$['xmi:type']) {
      case 'uml:PrimitiveType':
      case 'uml:DataType':
        this.rawTypesIndexes.push(index);
        break;
      case 'uml:Enumeration':
        this.rawEnumsIndexes.push(index);
        break;
      case 'uml:Class':
        this.rawClassesIndexes.push(index);
        break;
      case 'uml:Association':
        this.rawAssociationsIndexes.push(index);
        break;
      default:
    }
  }, this);
  this.findConstraints();
};

UMLDesignerParser.prototype.findConstraints = function () {
  // not supported by UML Designer yet
};

UMLDesignerParser.prototype.fillTypes = function () {
  this.rawTypesIndexes.forEach(function (element) {
    var type = this.root.packagedElement[element];
    this.addType(type.$.name, type.$['xmi:id']);
  }, this);
};

UMLDesignerParser.prototype.addType = function (typeName, typeId) {
  if (!this.databaseTypes.contains(_.upperFirst(typeName))) {
    throw new buildException(
        exceptions.WrongType,
        `The type '${typeName}' isn't supported by JHipster.`);
  }
  this.parsedData.addType(typeId, {name: _.upperFirst(typeName)});
};

UMLDesignerParser.prototype.fillEnums = function () {
  this.rawEnumsIndexes.forEach(function (index) {
    var enumElement = this.root.packagedElement[index];
    if (!enumElement.$.name) {
      throw new buildException(
          exceptions.NullPointer, "The enumeration's name can't be null.");
    }
    var enumData = {name: enumElement.$.name, values: []};
    if (enumElement.ownedLiteral) {
      enumElement.ownedLiteral.forEach(function (literalIndex) {
        if (!literalIndex.$.name.toUpperCase()) {
          throw new buildException(
              exceptions.NullPointer,
              "The Enumeration's values can't be null.");
        }
        enumData.values.push(literalIndex.$.name.toUpperCase());
      });
    }
    this.parsedData.addEnum(enumElement.$['xmi:id'], enumData);
  }, this);
};

UMLDesignerParser.prototype.fillClassesAndFields = function () {
  this.rawClassesIndexes.forEach(function (index) {
    var element = this.root.packagedElement[index];

    if (!element.$.name) {
      throw new buildException(
          exceptions.NullPointer, 'Classes must have a name.');
    }
    this.checkForUserClass(element);
    this.addClass(element);

    if (element.ownedAttribute) {
      this.handleAttributes(element);
    }
  }, this);
};

UMLDesignerParser.prototype.handleAttributes = function (element) {
  element.ownedAttribute.forEach(function (attribute) {
    if (!attribute.$.name) {
      throw new buildException(
          exceptions.NullPointer,
          `No name is defined for the passed attribute, for class '${element.$.name}'.`);
    }
    if (!parser_helper.isAnId(attribute.$.name)) {
      this.addField(attribute, element.$['xmi:id']);
    }
  }, this);
};

UMLDesignerParser.prototype.checkForUserClass = function (element) {
  if (!this.userClassId && element.$.name.toLowerCase() === 'user') {
    this.userClassId = element.$['xmi:id'];
  }
};

/**
 * Adds a new class in the class map.
 * @param {Object} element the class to add.
 */
UMLDesignerParser.prototype.addClass = function (element) {
  var names = parser_helper.extractClassName(element.$.name);
  var classData = {
    name: _.upperFirst(names.entityName),
    tableName: names.tableName
  };
  checkForReservedClassName({
    name: classData.name,
    shouldThrow: true
  });
  checkForReservedTableName({
    name: classData.tableName,
    databaseTypeName: this.databaseTypes.getName(),
    shouldThrow: true
  });
  if (element.ownedComment && element.ownedComment[0].body) {
    classData.comment = element.ownedComment[0].body[0];
  }
  this.parsedData.addClass(element.$['xmi:id'], classData);
};

/**
 * Adds a new field to the field map.
 * @param {Object} element the field to add.
 * @param {string} classId the encapsulating class' id.
 */
UMLDesignerParser.prototype.addField = function (element, classId) {
  this.addRegularField(element, classId);
};

/**
 * Adds a (regular, not injected) field to the field map.
 * @param {Object} element the new field to add.
 * @param {string} classId the class' id.
 */
UMLDesignerParser.prototype.addRegularField = function (element, classId) {
  checkForReservedFieldName({
    name: element.$.name,
    databaseTypeName: this.databaseTypes.getName(),
    shouldThrow: true
  });
  var fieldData = {name: _.lowerFirst(element.$.name)};
  if (element.$.type) {
    fieldData.type = element.$.type;
  } else if (!element.type) {
    throw new buildException(
        exceptions.WrongField,
        `The field '${element.$.name}' does not possess any type.`);
  } else {
    var typeName =
        _.upperFirst(parser_helper.getTypeNameFromURL(element.type[0].$.href));
    this.addType(typeName, typeName); // id = name
    fieldData.type = typeName;
  }

  if (element.ownedComment && element.ownedComment[0].body) {
    fieldData.comment = element.ownedComment[0].body[0];
  }

  this.parsedData.addField(classId, element.$['xmi:id'], fieldData);
};

UMLDesignerParser.prototype.fillAssociations = function () {
  this.rawAssociationsIndexes.forEach(function (rawAssociationsIndex) {
    var association = this.root.packagedElement[rawAssociationsIndex];

    var associationData = {
      from: association.ownedEnd[0].$.type,
      to: association.ownedEnd[1].$.type,
      injectedFieldInFrom: association.ownedEnd[1].$.name,
      injectedFieldInTo: association.ownedEnd[0].$.name
    };

    if (association.ownedEnd[0].lowerValue[0].$.value !== '0') {
      associationData.isInjectedFieldInFromRequired = true;
    }
    if (association.ownedEnd[1].lowerValue[0].$.value !== '0') {
      associationData.isInjectedFieldInToRequired = true;
    }

    if (association.ownedEnd[1].upperValue[0].$.value === '*'
        && association.ownedEnd[0].upperValue[0].$.value === '*') {
      associationData.type = cardinalities.MANY_TO_MANY;
    } else if (association.ownedEnd[1].upperValue[0].$.value === '*'
        && association.ownedEnd[0].upperValue[0].$.value !== '*') {
      associationData.type = cardinalities.ONE_TO_MANY;
    } else if (association.ownedEnd[1].upperValue[0].$.value !== '*'
        && association.ownedEnd[0].upperValue[0].$.value === '*') {
      associationData.type = cardinalities.MANY_TO_ONE;
    } else {
      associationData.type = cardinalities.ONE_TO_ONE;
    }

    if (association.ownedComment && association.ownedComment[0].body) {
      associationData.commentInFrom = association.ownedComment[0].body[0];
      associationData.commentInTo = associationData.commentInFrom;
    }

    this.parsedData.addAssociation(association.$['xmi:id'], associationData);
  }, this);
};

UMLDesignerParser.prototype.fillConstraints = function () {
  // not supported by UML Designer yet
};
