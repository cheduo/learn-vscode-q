import {
	TextDocument,
	Range,
	TextEdit,
	DocumentFormattingEditProvider,
	FormattingOptions,
	CancellationToken,
	ProviderResult,
	EndOfLine,
} from "vscode";
const fullRange = (doc: TextDocument) =>
	doc.validateRange(new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
export const MODE = { language: "q" };

class QFormatter {
	formatDocument(
		document: TextDocument,
		range: Range
	): ProviderResult<TextEdit[]> {
		let textEdit: TextEdit[] = [];
		range = new Range(range.start.line, 0, range.end.line, Number.MAX_VALUE);
		let content = document.getText(range);
		let formatted = this.format(content, document.eol);
		// content = content.replace(/\n/g,'');
		textEdit.push(new TextEdit(range, formatted));
		return textEdit;
	}

	format(content: string, eol: EndOfLine): string {
		let eol_str: string = eol == EndOfLine.LF ? "\n" : "\r\n";
		let from: RegExp;
		let formatted: string;
		formatted = this.add_heading_space(content.split(eol_str)).join(eol_str);
		// add extra space before )\]}
		from = new RegExp(`(?<=${eol_str})([)\\\]}].*)`, "g");
		formatted = formatted.replace(from, " $1");
		from = new RegExp(`(${eol_str}){4,}`, "g");
		formatted = formatted.replace(from, "$1$1$1");
		return formatted;
	}

	add_heading_space(lines: string[]): string[] {
		let hspace : string;
		let formatted_line: string;
		let formatted_lines: string[] = [];
		let n_init = lines[0].search(/\S/);
		let n_curly_brackets = 0;
		let n_square_brackets = 0;
		// let n_equal: number = 0;
		let prev_is_semicolon = true;
		let n_heading_space = 0;
		let n_remove_space = 0;
		for (let line of lines) {
			formatted_line = line.trimEnd();
			n_heading_space = formatted_line.search(/\S/);
			formatted_line = formatted_line.trimStart();
			if (prev_is_semicolon) {
				n_remove_space = n_heading_space;
			}
			formatted_line = formatted_line.replace(/{\s+\[/, "{[");
			if (formatted_line.match(/^\\/)) {
				formatted_line = formatted_line.replace(/^\\\s*/, 'system "');
				formatted_line += '";';
			}
			hspace = " ".repeat(Math.max(0, n_init + n_curly_brackets + n_square_brackets + n_heading_space - n_remove_space));
			formatted_lines.push(
				formatted_line ? hspace + formatted_line : formatted_line
			);
			// formatted_line = formatted_line.split('\/')[0].trim(); //remove commend information
			// formatted_line = formatted_line.split('\"')[0]; //remove string information
			// n_equal += (formatted_line.match(/^[\w|\d]+\s*[!@#$%^&\*_\-\+\=,?]{0,1}:/g) || []).length;
			// n_equal -= (formatted_line.match(/;$/g) || []).length;
			formatted_line = this.rm_comment_string(formatted_line);
			if (formatted_line && !formatted_line.endsWith(";") && !formatted_line.match(/{|\[/)) {
				prev_is_semicolon = false;
			}
			n_curly_brackets += 4 * (formatted_line.match(/{/g) || []).length;
			n_curly_brackets -= 4 * (formatted_line.match(/}/g) || []).length;
			n_square_brackets += 2 * (formatted_line.match(/\[/g) || []).length;
			n_square_brackets -= 2 * (formatted_line.match(/\]/g) || []).length;
			n_curly_brackets = Math.max(0, n_curly_brackets);
			n_square_brackets = Math.max(0, n_square_brackets);
		}
		return formatted_lines;
	}

	rm_comment_string(line: string): string {
		if (line.match(/^\s*\//)) {
			return "";
		}
		line = line.replace(/\".*?\"/g, "");
		return line.split(" /")[0];
	}
}

export class QDocumentRangeFormatter implements DocumentFormattingEditProvider {
	public formatter: QFormatter;
	constructor() {
		this.formatter = new QFormatter();
	}
	provideDocumentFormattingEdits(
		document: TextDocument,
		options: FormattingOptions,
		token: CancellationToken
	): ProviderResult<TextEdit[]> {
		return this.formatter.formatDocument(document, fullRange(document));
	}
	// provideDocumentRangeFormattingEdits(document: TextDocument, range: Range) {
	provideDocumentRangeFormattingEdits(
		document: TextDocument,
		range: Range,
		options: FormattingOptions,
		token: CancellationToken
	): ProviderResult<TextEdit[]> {
		return this.formatter.formatDocument(document, range);
	}
}
