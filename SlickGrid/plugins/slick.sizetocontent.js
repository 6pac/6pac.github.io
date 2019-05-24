(function ($) {

    // AutoColumnSize Overview
    // -----------------------
    // The AutoColumnSize plugin is designed to allow the grid to make intelligent choices about the 
    // width of its columns based on the cell content of the header and rows. The columns widths can  
    // be sized independently of the viewport, or a fit-viewport-to-columns or fit-columns-to-viewport  
    // strategy can be used.
    // The column width of each column can be locked to a particular width, set to a specific guide
    // width, or based on the content of the header (optionally) and any number of rows. Specific  
    // columns may be set to expand to fill extra space, or all columns may be scaled to fit the viewport.
    //
    // AutoColumnSize plugin options
    // -----------------------------
    //  option
    //   .viewportMode: Legacy (Legacy, IgnoreViewport, FitColsToViewport, FitViewportToCols)
    //   .switchToScrollModeWidthPercent: undefined
    //   .minViewportWidthPx: undefined
    //   .maxViewportWidthPx: undefined
    //
    //  forceFitColumns
    //  absoluteColumnMinWidth - internal setting calulated from cell border and padding
    //
    //  DETAILS
    //
    //  viewportMode
    //    - a named mode (details below) defining the relationship between the viewport and the total 
    //      column width
    //
    //  minViewportWidthPx, maxViewportWidthPx
    //    - the minimum viewport width in the case of viewportMode.FitViewportToCols
    //
    //
    // ViewportModes
    // -------------
    // 
    // IgnoreViewport:
    //   - columns are sized independently of the viewport width. There will be empty space at the
    //     right of the viewport if the columns are smaller, and a horizontal scroll bar if they are larger.
    //   - SizeToRemaining is ignored, its presence will trigger a console message
    //
    // FitColsToViewport:
    //   - columns sized are calculated using the column strategies
    //   - if addl space remains in the viewport and there are SizeToRemaining cols, just the  
    //     SizeToRemaining cols expand proportionally to fill viewport
    //   - if the total columns width is wider than the viewport by switchToScrollModeWidthPercent, switch to IgnoreViewport mode
    //   - otherwise (ie. no SizeToRemaining cols or viewport smaller than columns) all cols other 
    //     than 'Locked' scale in proportion to fill viewport
    //
    // FitViewportToCols:
    //   - columns sized are calculated using the column strategies
    //   - viewport is resized to fit columns
    //   - if viewport with is outside MinViewportWidthPx and MaxViewportWidthPx, then the viewport is
    //     set to MinViewportWidthPx or MaxViewportWidthPx and the FitColsToViewport algorithm is used
    //
    //
    // AutoColumnSize column options (declared as members of an 'autosize' property)
    //     
    //   .ignoreHeaderText: false
    //   .colValueArray: undefined
    //   .allowAddlPercent: undefined
    //   .formatterOverride: undefined
    //   .autosizeMode: ContentIntelligent (Lock, Guide, Content, ContentIntelligent)
    //   .rowSelectionModeOnInit: undefined (FirstRow, LastRow)
    //   .rowSelectionMode: FirstNRows (FirstRow, FirstNRows, AllRows)
    //   .rowSelectionCount: 100
    //   .valueFilterMode: None (None, DeDuplicate, GetGreatest, GetLongestText, CompareFunction(), FilterFunction())
    //   .widthEvalMode: HTML (CanvasTextSize, HTML)
    //   .sizeToRemaining: undefined
    //   
    // columnDefaults.resizable
    // columnDefaults.minWidth
    // columnDefaults.maxWidth
    //
    //  DETAILS
    //
    //  ignoreHeaderText
    //    - ignores the content of the header when looking for the widest content
    //
    //  colValueArray
    //    - an array of all possible values for the column (for drops downs, etc). Used instead of row
    //      data. May also be used to pass a single value (eg. longest form of date)
    //
    //  formatterOverride
    //    - allows the formatter to be overridden with a more efficient function for examining the width.
    //      The highest of the following will be used: (1) data value converted to text, (2) formatter, 
    //      (3) formatter override
    //
    //  widthPx
    //    - the column width used in the case of AutoWidthStrategy.Locked or AutoWidthStrategy.Guide
    //
    //  minWidthPx, maxWidthPx
    //    - the absolute maximum and minimum column widths for all modes
    //
    //  autoWidthStrategy
    //    - a named strategy (see below) for determining the column width
    //
    //  sizeToRemaining
    //    - designate a column to expand to fill space in viewportMode.FitColsToViewport. If multiple 
    //      columns are marked with sizeToRemaining, columns will fill unused space in proportion to 
    //      their initial calculated size
    //
    //  checkRowCount
    //    - in AutoWidthStrategy.TopNRows, the number of rows to check for widest content.
    //
    //  deDuplicate
    //    - create a unique value dictionary for values before doing browser cell simulation
    //
    //
    // AutoWidthStrategy
    // -----------------
    //
    // Locked:
    //   - the final column width is locked to exactly .widthPx and will not be scaled.
    //     MinWidthPx and MaxWidthPx should not be used and will trigger a log message if specified.
    //
    // Guide:
    //   - the .widthPx will be used as an initial width, but the column may be scaled
    //
    // Top1Row:
    //   - content width of the first row only will be used as the column width. This is useful where
    //     all column entries share a standard format, eg dates, GUIDs
    //
    // TopNRows:
    //   - content width of the widest of the first .checkRowCount rows will be used as the column width.
    //
    // Last1Row:
    //   - content width of the last row only will be used as the column width. This is useful where
    //     an incrementing number is present.
    //
    // AllRows:
    //   - content width of the widest of all the rows will be used as the column width.
    //
    
    var ViewportMode = {
        IgnoreViewport: 'IGV',
        FitColsToViewport: 'FCV',
        FitViewportToCols: 'FVC'
    };
    if (Object.freeze) { Object.freeze(ViewportMode); }
    
    var AutoWidthStrategy = {
        Locked: 'LK',
        Guide: 'GU',
        Top1Row: 'TOP1',
        TopNRows: 'TOPN',
        AllRows: 'ALL'
    };
    if (Object.freeze) { Object.freeze(AutoWidthStrategy); }
    
    function SizeToContent(options) {
        //-----------------------------------------------
        // Core plugin management
        //-----------------------------------------------
        
        var _grid;
        var _self = this;
        var _handler = new Slick.EventHandler();
        
        var _defaultPluginOptions = {
            viewportMode: ViewportMode.FitColsToViewport,
            switchToScrollModeWidthPercent: undefined,
            minViewportWidthPx: undefined,
            maxViewportWidthPx: undefined
        };     
        
        var _defaultColumnOptions = {
            autoWidthStrategy: AutoWidthStrategy.TopNRows,
            ignoreHeaderText: false,
            colValueArray: undefined,
            formatterOverride: undefined,
            widthPx: undefined,
            minWidthPx: undefined,
            maxWidthPx: undefined,
            sizeToRemaining: false,
            checkRowCount: 100,
            deDuplicate: true
        };
        
        var canvas = null;
        var canvas_context = null;

        function init(grid) {
            options = $.extend(true, {}, _defaultPluginOptions, options);
            _grid = grid;

            _handler
                .subscribe(_grid.onHeaderCellRendered, handleHeaderCellRendered)
                .subscribe(_grid.onBeforeHeaderCellDestroy, handleBeforeHeaderCellDestroy)
                .subscribe(_grid.onKeyDown, handleControlKeys);

            // test for brower canvas support, canvas_context!=null if supported
            canvas = document.createElement("canvas");
            if (canvas.getContext) { canvas_context = canvas.getContext("2d"); }
        }

        function getOptions() {
          return options;
        }

        function setOptions(newOptions) {
          options = $.extend(options, newOptions);
        }
        
        function handleHeaderCellRendered(e, args) {
            var c = args.node;
            $(c).on("dblclick.autosize", ".slick-resizable-handle", columnUIResize);            
        }

        function handleBeforeHeaderCellDestroy(e, args) {           
            var c = args.node;
            $(c).off("dblclick.autosize", ".slick-resizable-handle", columnUIResize);
        }

        function destroy() {
            _handler.unsubscribeAll();
        }

        function handleControlKeys(event) {
            if (event.ctrlKey && event.shiftKey && event.keyCode === Slick.keyCode.A) {
                resizeAllColumns();
            }
        }

        //-----------------------------------------------
        //Autosizing
        //-----------------------------------------------
        
        // _grid.getContainerNode()
        function getViewportWidth() {
          viewportW = parseFloat($container.width());
        }
        
        function resizeAllColumns() {
            if (_grid.getContainerNode().offsetParent === null) return;
            var allColumns = _grid.getColumns();
            var gridOps = _grid.getOptions();

            allColumns.forEach(function (columnDef, index) {
                if (columnDef && (!columnDef.resizable || columnDef._autoCalcWidth === true)) return;
                var el = document.getElementById(_grid.getUID() + columnDef.id);
                var headerWidth = 0; //getElementWidth(el);
                var autoSizeWidth = Math.max(headerWidth, getMaxColumnTextWidth(columnDef, index)) + 1;

                // Check we are smaller than the maxWidth if provided
                autoSizeWidth = Math.min(options.maxWidth, autoSizeWidth);

                // Save a piece of info against column so we don't calculate every time we call resize
                columnDef._autoCalcWidth = true;
                columnDef.width = autoSizeWidth;   
                columnDef.minWidth = autoSizeWidth;  
            });
            _grid.autosizeColumns();
            _grid.onColumnsResized.notify();
        }

        function reSizeColumnByName(name) {
            var columnIdx = _grid.getColumnIndex(name);
            var allColumns = _grid.getColumns();
            var columnDef;
            if (columnIdx !== undefined) {
                columnDef = allColumns[columnIdx];
            }

            if (!columnDef || !columnDef.resizable) {
                return;
            }

            var headerWidth = columnDef.width;
            var autoSizeWidth = Math.max(headerWidth, getMaxColumnTextWidth(columnDef, columnIdx)) + 1;

            if (autoSizeWidth !== headerWidth) {
                columnDef.width = autoSizeWidth;
                _grid.autosizeColumns();
                _grid.onColumnsResized.notify();
            }
        }

        function getColHeaderWidths() {
          var rtn = [];
          var allColumns = _grid.getColumns();
          allColumns.forEach(function (columnDef, index) {
              rtn.push(getColHeaderWidth(columnDef));
          });
          return rtn;
        }

        function getColHeaderWidth(columnDef) {
          var width = 0;
          //if (columnDef && (!columnDef.resizable || columnDef._autoCalcWidth === true)) return;
          var headerColElId = _grid.getUID() + columnDef.id;
          var headerColEl = document.getElementById(headerColElId);
          var dummyHeaderColElId = headerColElId + "_";
          if (headerColEl) {
            // headers have been created, use clone technique
            var clone = headerColEl.cloneNode(true);
            clone.id = dummyHeaderColElId;
            clone.style.cssText = 'position: absolute; visibility: hidden;right: auto;text-overflow: initial;white-space: nowrap;';
            headerColEl.parentNode.insertBefore(clone, headerColEl);
            width = clone.offsetWidth;
            clone.parentNode.removeChild(clone);
          } else {
            // headers have not yet been created, create a new node
            var header = _grid.getHeader(columnDef);
            headerColEl = $("<div class='ui-state-default slick-header-column' />")
              .html("<span class='slick-column-name'>" + columnDef.name + "</span>")
              .attr("id", dummyHeaderColElId)
              .css({ "position": "absolute", "visibility": "hidden", "right": "auto", "text-overflow:": "initial", "white-space": "nowrap" })
              .addClass(columnDef.headerCssClass || "")
              .appendTo(header);        
            width = headerColEl[0].offsetWidth;
            header[0].removeChild(headerColEl[0]);
          }   
          return width;
        }
            
        function columnUIResize(e) {
            var headerEl = $(e.currentTarget).closest('.slick-header-column');
            var columnDef = headerEl.data('column');

            if (!columnDef || !columnDef.resizable) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            var headerWidth = getElementWidth(headerEl[0]);
            var colIndex = _grid.getColumnIndex(columnDef.id);
            var allColumns = _grid.getColumns();
            var column = allColumns[colIndex];

            var autoSizeWidth = Math.max(headerWidth, getMaxColumnTextWidth(columnDef, colIndex)) + 1;

            if (autoSizeWidth !== column.width) {
                column.width = autoSizeWidth;
                _grid.autosizeColumns();
                _grid.onColumnsResized.notify();
            }
        }

    //   .ignoreHeaderText: false
    //   .colValueArray: undefined
    //   .formatterOverride: undefined
    //   .autosizeMode: Content (Lock, Guide, Content)
    //   .rowSelectionMode: FirstNRows (First1Row, FirstNRows, Last1Row, AllRows)
    //   .valueFilterMode: none (None, DeDuplicate, GetGreatest, CompareFunction())
    //   .sizeToRemaining: undefined
    //   .rowSelectionCount: 100

        function getColTextWidths(mode) {
          var $gridCanvas = $(_grid.getCanvasNode(0, 0));
          var rtn = [];
          var allColumns = _grid.getColumns();
          allColumns.forEach(function (columnDef, index) {
              rtn.push(getW(columnDef, $gridCanvas, mode));
          });
          return rtn;
        }
        
        function getW(columnDef, $gridCanvas, mode) {
            var data = _grid.getData().getItems();
            var colIndex = _grid.getColumnIndex(columnDef.id);

            var $rowEl = $('<div class="slick-row ui-widget-content"></div>');
            var $cellEl = $('<div class="slick-cell"></div>');
            $cellEl.css({
                "position": "absolute",
                "visibility": "hidden",
                "text-overflow": "initial",
                "white-space": "nowrap"
            });
            $rowEl.append($cellEl);
 
            var len, max = 0, text, maxText, formatterResult, maxWidth = 0;
             
            if (mode === "C") {
              $gridCanvas.append($rowEl);
              
              canvas_context.font = $cellEl.css("font-size") + " " + $cellEl.css("font-family");
              $(data).each(function (index, row) {
                  text = '' + row[columnDef.field];
                  len = text ? canvas_context.measureText(text).width : 0;
                  if (len > max) { max = len; maxText = text; }
              });
              
              $cellEl.html(maxText);
              len = $cellEl.width();
              
              $rowEl.remove();
              return len;
            }
            
            if (mode === "F") {
              $gridCanvas.append($rowEl);
            }
            $(data).each(function (index, row) {
                if (columnDef.formatter) {
                  formatterResult = columnDef.formatter(index, colIndex, row[columnDef.field], columnDef, row);
                } else {
                  formatterResult = '' + row[columnDef.field];
                }
                _grid.applyFormatResultToCellNode(formatterResult, $cellEl[0]);
                len = $cellEl.width();
                if (len > max) { max = len; }
             });
                       
            $rowEl.remove();
            return max;
        }
    
        function getMaxColumnTextWidth(columnDef, $gridCanvas) {
            var autosizeOptions = columnDef.AutoSize || {};
            var texts = [];
            
            // get data items
            var data = _grid.getData();
            if (Slick.Data && data instanceof Slick.Data.DataView) {
                data = data.getItems();
            }

            // get unique values
            let length = data.length, seen = new Set();
            outer:
            for (let index = 0; index < length; index++) {
              let value = data[index][columnDef.field];
              if (seen.has(value)) continue outer;
              seen.add(value);
              texts.push(value);
            }

            // create row template
            var max = 0, template = null;
            var formatFun = columnDef.formatter;

            var rowEl = $('<div class="slick-row ui-widget-content"><div class="slick-cell"></div></div>');
            rowEl.find(".slick-cell").css({
                "visibility": "hidden",
                "text-overflow": "initial",
                "white-space": "nowrap"
            });
            $gridCanvas.append(rowEl);
            
            // get computed style
            canvas_context.font = rowEl.css("font-size") + " " + rowEl.css("font-family");
            $(texts).each(function (index, text) {
                var templateOrText;
                if (formatFun) {
                    templateOrText = $("<span>" + formatFun(index, colIndex, text, columnDef, data[index]) + "</span>");
                    text = templateOrText.text() || text;
                }

                var length = text ? canvas_context.measureText(text).width : 0;
                if (length > max) {
                    max = length;
                    templateOrText = templateOrText || text;
                }
            });
            
            var width = getTemplateWidth(rowEl, templateOrText);
            $(rowEl).remove();
            return width;
        }

        function getTemplateWidth(rowEl, templateOrText) {
            var cell = $(rowEl.find(".slick-cell"));
            cell.append(templateOrText);
            $(cell).find("*").css("position", "relative");
            return cell.outerWidth() + 1;
        }

         
        return {
            "init": init,
            "destroy": destroy,
            "pluginName": "SizeToContent",

            "getOptions": getOptions,
            "setOptions": setOptions,
            "resizeAllColumns": resizeAllColumns,
            "reSizeColumnByName": reSizeColumnByName,
            "getColHeaderWidths": getColHeaderWidths,
            "getColTextWidths": getColTextWidths
        };
    }
    
    $.extend(true, window, {
        "Slick": {
            "Plugins": {
                "SizeToContent": SizeToContent
            },
            "ViewportMode" : ViewportMode,
            "AutoWidthStrategy" : AutoWidthStrategy
        }
    });   
}(jQuery));