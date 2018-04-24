import AsciiDoctorFactory from 'asciidoctor.js';
import { includeProcessor } from './includes';
import { preprocessor } from './conditionals';

export const asciidoctor = AsciiDoctorFactory();

asciidoctor.Extensions.register(function() {
  this.preprocessor(preprocessor);
  this.includeProcessor(includeProcessor);
});
