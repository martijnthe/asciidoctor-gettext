import IncludeProcessor = AsciiDoctorJs.IncludeProcessor;

// NOTE: this is a 'no-op' include processor. reader.push_include() is not
// called at all, so nothing is actually included. The rationale is that it's
// probably a better idea to gettextize each .adoc separately, so that one .pot
// is created for each .adoc. That way, if an .adoc is included in multiple
// places, the strings from the included .adoc only need to be translated once.

export function includeProcessor(this: IncludeProcessor) {
  this.process((document, reader, target, attributes) => {
    // tslint:disable-next-line:no-empty
  });
  this.handles((target) => {
    return true;
  });
}
