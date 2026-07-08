import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class LowerCasePipe implements PipeTransform {
  transform(value: any) {
    if (value && typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  }
}
