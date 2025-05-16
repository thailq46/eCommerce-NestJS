import {registerDecorator, ValidationArguments, ValidationOptions} from 'class-validator';

export function IsNotSpecialCharacter(validationOptions?: ValidationOptions): PropertyDecorator {
   return function (object: Record<string, any>, propertyName: string) {
      registerDecorator({
         name: 'IsNotSpecialCharacter',
         target: object.constructor,
         propertyName: propertyName,
         constraints: [],
         options: validationOptions,
         validator: {
            validate(value: string, args?: ValidationArguments) {
               if (value === undefined || typeof value !== 'string') return false;
               const regex = /[!`~#$%^&*()?'':{}|<>]/g;
               return !regex.test(value);
            },
            defaultMessage(args?: ValidationArguments): string {
               return `${args?.property} không chứa ký tự đặc biệt`;
            },
         },
      });
   };
}
