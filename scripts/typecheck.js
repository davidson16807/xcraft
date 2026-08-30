'use strict';
// HUMAN WRITTEN

// // for production:
// function typcheck(object, typestring) {}

const typestring = object=>object == null? '1' : object.constructor.name;

function typecheck(object, typestring) {
   const types = typestring.split('+');
   const type = (
      (Number.isInteger(object)? 'Integer':null) 
      ?? object?.constructor?.name 
      ?? (object==null? '1':null)
   );
   if (types.includes('Number')) { types.push('Integer'); }
   if (!types.includes(type)) {
      throw new Error(`expected ${typestring}, found ${type}`);
   }
}
