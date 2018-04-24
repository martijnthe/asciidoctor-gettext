import AsciiDoctorFactory from 'asciidoctor.js';
import { preprocessor } from './conditionals';

export const asciidoctor = AsciiDoctorFactory();

asciidoctor.Extensions.register(function() {
  this.preprocessor(preprocessor);
});
