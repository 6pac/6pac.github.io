(function ($) {

    $.extend(true, window, {
        "Slick": {
            "Plugins": {
                "AutoColumnSize": AutoColumnSize
            },
            "ViewportMode" : ViewportMode,
            "AutoWidthStrategy" : AutoWidthStrategy
        }
    });

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
    //   .viewportMode: FitColsToViewport (Scroll, FitColsToViewport, FitViewportToCols)
    //   .switchToScrollModeWidthPercent: undefined
    //   .minViewportWidthPx: undefined
    //   .maxViewportWidthPx: undefined
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
    // Scroll:
    //   - columns are sized independently of the viewport width. There will be empty space at the
    //     right of the viewport if the columns are smaller, and a horizontal scroll bar if they are larger.
    //   - SizeToRemaining is ignored, its presence will trigger a console message
    //
    // FitColsToViewport:
    //   - columns sized are calculated using the column strategies
    //   - if addl space remains in the viewport and there are SizeToRemaining cols, just the  
    //     SizeToRemaining cols expand proportionally to fill viewport
    //   - if the total columns width is wider than the viewport by switchToScrollModeWidthPercent, switch to Scroll mode
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
    //   .formatterOverride: undefined
    //   .widthPx: undefined
    //   .minWidthPx: undefined
    //   .maxWidthPx: undefined
    //   .autoWidthStrategy: TopNRows (Locked, Guide, Top1Row, TopNRows, AllRows)
    //   .sizeToRemaining: undefined
    //   .checkRowCount: 100
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
    // AllRows:
    //   - content width of the widest of all the rows will be used as the column width.
    //
    
    ViewportMode = {
        Scroll: 'SC',
        FitColsToViewport: 'FV',
        FitViewportToCols: 'FC'
    };
    if (Object.freeze) { Object.freeze(ViewportMode); }
    
    AutoWidthStrategy = {
        Locked: 'LK',
        Guide: 'GU',
        Top1Row: 'TOP1',
        TopNRows: 'TOPN',
        AllRows: 'ALL'
    };
    if (Object.freeze) { Object.freeze(AutoWidthStrategy); }
    
    function AutoColumnSize(options) {
        var _grid;
        var _self = this;
        var _handler = new Slick.EventHandler();
        var _defaults = {
            maxWidth: 800
        };

        var context;

        // _grid.getContainerNode()
        function getViewportWidth() {
          viewportW = parseFloat($container.width());
        }
        
        function init(grid) {
            options = $.extend(true, {}, _defaults, options);
            _grid = grid;
            maxWidth = options.maxWidth;

            _handler
                .subscribe(_grid.onHeaderCellRendered, handleHeaderCellRendered)
                .subscribe(_grid.onBeforeHeaderCellDestroy, handleBeforeHeaderCellDestroy)
                .subscribe(_grid.onKeyDown, handleControlKeys);

            context = document.createElement("canvas").getContext("2d");
        }

        function handleHeaderCellRendered(e, args) {
            var c = args.node;
            $(c).on("dblclick.autosize", ".slick-resizable-handle", reSizeColumn);            
        }

        function handleBeforeHeaderCellDestroy(e, args) {           
            var c = args.node;
            $(c).off("dblclick.autosize", ".slick-resizable-handle", reSizeColumn);
        }

        function destroy() {
            _handler.unsubscribeAll();
        }

        function handleControlKeys(event) {
            if (event.ctrlKey && event.shiftKey && event.keyCode === Slick.keyCode.A) {
                resizeAllColumns();
            }
        }

        function resizeAllColumns() {
            if (_grid.getContainerNode().offsetParent === null) return;
            var allColumns = _grid.getColumns();
            var gridOps = _grid.getOptions();

            allColumns.forEach(function (columnDef, index) {
                if (columnDef && (!columnDef.resizable || columnDef._autoCalcWidth === true)) return;
                var el = document.getElementById(_grid.getUID() + columnDef.id);
                var headerWidth = getElementWidth(el);
                var autoSizeWidth = Math.max(headerWidth, getMaxColumnTextWidth(columnDef, index)) + 1;

                // Check we are smaller than the maxWidth if provided
                autoSizeWidth = Math.min(maxWidth, autoSizeWidth);

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

        function reSizeColumn(e) {
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

        function getMaxColumnTextWidth(columnDef, colIndex) {
            var texts = [];
            var rowEl = createRow(columnDef);
            var data = _grid.getData();
            if (Slick.Data && data instanceof Slick.Data.DataView) {
                data = data.getItems();
            }

            let length = data.length, result = [], seen = new Set();
            outer:
            for (let index = 0; index < length; index++) {
              let value = data[index][columnDef.field];
              if (seen.has(value)) continue outer;
              seen.add(value);
              result.push(value);
            }

            var template = getMaxTextTemplate(result, columnDef, colIndex, data, rowEl);
            var width = getTemplateWidth(rowEl, template);
            deleteRow(rowEl);
            return width;
        }

        function getTemplateWidth(rowEl, template) {
            var cell = $(rowEl.find(".slick-cell"));
            cell.append(template);
            $(cell).find("*").css("position", "relative");
            return cell.outerWidth() + 1;
        }

        function getMaxTextTemplate(texts, columnDef, colIndex, data, rowEl) {
            var max = 0,
                maxTemplate = null;
            var formatFun = columnDef.formatter;

            context.font = rowEl.css("font-size") + " " + rowEl.css("font-family");
            $(texts).each(function (index, text) {
                var template;
                if (formatFun) {
                    template = $("<span>" + formatFun(index, colIndex, text, columnDef, data[index]) + "</span>");
                    text = template.text() || text;
                }

                var length = text ? context.measureText(text).width : 0;
                if (length > max) {
                    max = length;
                    maxTemplate = template || text;
                }
            });
            return maxTemplate;
        }

        function createRow(columnDef) {
            var rowEl = $('<div class="slick-row"><div class="slick-cell"></div></div>');
            rowEl.find(".slick-cell").css({
                "visibility": "hidden",
                "text-overflow": "initial",
                "white-space": "nowrap"
            });
            var gridCanvas = $(_grid.getContainerNode()).find(".grid-canvas")[0];
            $(gridCanvas).append(rowEl);
            return rowEl;
        }

        function deleteRow(rowEl) {
            $(rowEl).remove();
        }

        function getElementWidth(element) {
            var width, clone = element.cloneNode(true);
            clone.style.cssText = 'position: absolute; visibility: hidden;right: auto;text-overflow: initial;white-space: nowrap;';
            element.parentNode.insertBefore(clone, element);
            width = clone.offsetWidth;
            clone.parentNode.removeChild(clone);
            return width;
        }

        function getElementWidthUsingCanvas(element, text) {
            context.font = element.css("font-size") + " " + element.css("font-family");
            var metrics = context.measureText(text);
            return metrics.width;
        }

        return {
            "init": init,
            "destroy": destroy,

            "resizeAllColumns": resizeAllColumns,
            "reSizeColumnByName": reSizeColumnByName
        };
    }
}(jQuery));