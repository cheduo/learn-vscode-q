import { TextDocument, Range, TextEdit, DocumentFormattingEditProvider, FormattingOptions, CancellationToken, ProviderResult, EndOfLine} from "vscode";
const fullRange = (doc: TextDocument) => doc.validateRange(new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
export const MODE = { language: 'q' };
class QFormatter {
    // constructor() {
    // }
    formatDocument(document: TextDocument, range: Range): ProviderResult<TextEdit[]> {
        let textEdit : TextEdit[] = [];
        let content = document.getText(range);
        let formatted = this.format(content, document.eol);
        // content = content.replace(/\n/g,'');
        textEdit.push(new TextEdit(range, formatted));
        return textEdit;
    }

    format(content: string, eol: EndOfLine): string {
        // add extra space before )\]}
        let formatted = content.replace(/(^[)\\\]}].*)/,' $1');
        formatted = content.replace(/(^[)\\\]}].*)/,' $1');
        let from = eol==EndOfLine.LF ? /(?<=\n)([)\\\]}].*)/g : /(?<=\r\n)([)\\\]}].*)/g;
        formatted = formatted.replace(from,' $1');
        // remove extra end of line space
        from = eol==EndOfLine.LF ? /[ \t]+(?=\n)/g : /[ \t]+(?=\r\n)/g;
        formatted = formatted.replace(from,'');
        // remove extra end of line space
        from = eol==EndOfLine.LF ? /(\n){4,}/g : /(\r\n){4,}/g;
        formatted = formatted.replace(from,'$1$1$1');
        return formatted;
    }
}

export class QDocumentRangeFormatter implements DocumentFormattingEditProvider {
    public formatter: QFormatter;
    constructor() {
        this.formatter = new QFormatter();
    }
    provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]> {
        return this.formatter.formatDocument(document, fullRange(document));
    }
    // provideDocumentRangeFormattingEdits(document: TextDocument, range: Range) {
    provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]> {
        return this.formatter.formatDocument(document, range);
    }
}
