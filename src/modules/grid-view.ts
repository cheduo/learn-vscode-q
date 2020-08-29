import * as vscode from 'vscode';
import * as path from 'path';

let gridPanel: vscode.WebviewPanel | undefined = undefined;

export type MetaResult = {
    c: string;
    t: string;
    a: string;
    f: string;
};

export type QueryResult = {
    result: boolean,
    type: number,
    meta: MetaResult[],
    data: any,
};

function showGridView(context: vscode.ExtensionContext, result: QueryResult): void {
    if (!isTable(result)) {
        return;
    }

    // Function to get ag-grid column type.
    let getColumnType = (t: string) => {
        switch (t) {
            case "f": case "e": case "i": case "j": case "h": case "b": return 'numberColumn';
            case "c": case "s": case "S": case "C": return 'textColumn';
            case "d": case "p": return 'dateColumn';
            default: break;
        }

        return false;
    };

    // Create column definitions for ag-grid.
    var columnDefinitions = result.meta.map(m => {
        return { headerName: m.c, field: m.c, type: getColumnType(m.t) };
    });

    // This is stupid but convert strings back to numbers if possible.
    for (let i = 0; i < result.meta.length; ++i) {
        let t = result.meta[i].t;
        let c = result.meta[i].c;

        if (t === "f" || t === "e") {
            for (let j = 0; j < result.data.length; ++j) {
                result.data[j][c] = parseFloat(result.data[j][c]);
            }
        }
        else if (t === "i" || t === "j" || t === "h" || t === "b") {
            for (let j = 0; j < result.data.length; ++j) {
                result.data[j][c] = parseInt(result.data[j][c]);
            }
        }
    }

    const position: string | undefined = vscode.workspace.getConfiguration().get("vscode-kdb-q.gridViewPosition");
    const columnToShowIn: vscode.ViewColumn = (<any>vscode.ViewColumn)[position!];

    if (gridPanel) {
        // If we already have a panel, show it in the target column
        // gridPanel.reveal(columnToShowIn, true);
    }
    else {
        // Otherwise, create a new panel
        gridPanel = vscode.window.createWebviewPanel('kdb-q-grid', 'KDB+ Grid', { preserveFocus: true, viewColumn: columnToShowIn }, { enableScripts: true, retainContextWhenHidden: true });

        const uriAgGrid = gridPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'libs', 'ag-grid', 'ag-grid-community.min.noStyle.js')));
        const uriAgGridCSS = gridPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'libs', 'ag-grid', 'ag-grid.css')));
        const uriAgGridTheme = gridPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'libs', 'ag-grid', 'ag-theme-balham-dark.css')));

        const grid_content = `
            <html>
            <head>
                <script src="${uriAgGrid}"></script>
                <style> html, body { margin: 0; padding: 0; height: 100%; } </style>
                <link rel="stylesheet" href="${uriAgGridCSS}">
                <link rel="stylesheet" href="${uriAgGridTheme}">
            </head>
            <body>
                <!-- div style="margin: 10px; "><button onclick="exportToCsv()">Export to CSV</button></div -->
                <div id="myGrid" style="height: 100%; width: 100%;" class="ag-theme-balham-dark"></div>
            </body>
            <script type="text/javascript">
                var gridOptions = {
                    defaultColDef: {
                        editable: true,
                        resizable: true,
                        filter: true,
                        sortable: true
                    },
                    columnTypes: {
                        textColumn: { filter: 'agTextColumnFilter' },
                        numberColumn: { filter: 'agNumberColumnFilter' },
                        dateColumn: {
                              // specify we want to use the date filter
                              filter: 'agDateColumnFilter',
                    
                              // add extra parameters for the date filter
                              filterParams: {
                                // provide comparator function
                                comparator: function(filterLocalDateAtMidnight, cellValue) {
                                      // We create a Date object for comparison against the filter date
                                      var dateParts = cellValue.substring(0, 10).split('.');
                                      var year = Number(dateParts[0]);
                                      var month = Number(dateParts[1]) - 1;
                                      var day = Number(dateParts[2]);
                                      var cellDate = new Date(year, month, day);
                    
                                      // Now that both parameters are Date objects, we can compare
                                      if (cellDate < filterLocalDateAtMidnight) {
                                        return -1;
                                    }
                                    else if (cellDate > filterLocalDateAtMidnight) {
                                        return 1;
                                    }
                                    else {
                                        return 0;
                                      }
                                },
                              },
                        },
                    }
                };

                function exportToCsv() {
                    var params = {
                        // suppressQuotes: getValue('#suppressQuotes'),
                        // columnSeparator: getValue('#columnSeparator')
                    };
                    
                    if (params.suppressQuotes || params.columnSeparator) {
                        alert('NOTE: you are downloading a file with non-standard quotes or separators - it may not render correctly in Excel.');
                    }

                    gridOptions.api.exportDataAsCsv(params);
                };

                // Handle the message inside the webview.
                window.addEventListener('message', event => {
                    const message = event.data;
                    const payload = message.payload;
                    const columns = message.columns;

                    gridOptions.api.setRowData(payload);
                    gridOptions.api.setColumnDefs(columns);

                    var allColumnIds = [];
                    gridOptions.columnApi.getAllColumns().forEach(function(column) {
                          allColumnIds.push(column.colId);
                    });
                  
                    gridOptions.columnApi.autoSizeColumns(allColumnIds, false);
                });

                // Setup the grid after the page has finished loading.
                document.addEventListener('DOMContentLoaded', function () {
                    var gridDiv = document.querySelector('#myGrid');
                    new agGrid.Grid(gridDiv, gridOptions);
                });
            </script>
        </html>
        `;

        gridPanel.webview.html = grid_content;

        // Reset when the current panel is closed
        gridPanel.onDidDispose(() => {
            gridPanel = undefined;
        }, null, context.subscriptions);
    }

    gridPanel.webview.postMessage({ columns: columnDefinitions, payload: result.data });
}

function isTable(result: QueryResult): boolean {
    if (!result.result || !result.meta || result.meta.length === 0/* || result.data.length === 0*/) {
        return false;
    }
    return true;
}
