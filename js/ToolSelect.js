/**
 * Created by GDur on 29-Dec-15.
 */

var toolSelect = new paper.Tool();
toolSelect.mouseStartPos = new paper.Point();
toolSelect.mode = null;
toolSelect.hitItem = null;
toolSelect.originalContent = null;
toolSelect.changed = false;
toolSelect.duplicates = null;

toolSelect.createDuplicates = function (content) {
    this.duplicates = [];
    for (var i = 0; i < content.length; i++) {
        var orig = content[i];
        var item = paper.Base.importJSON(orig.json);
        if (item) {
            item.selected = false;
            this.duplicates.push(item);
        }
    }
};
toolSelect.removeDuplicates = function () {
    for (var i = 0; i < this.duplicates.length; i++)
        this.duplicates[i].remove();
    this.duplicates = null;
};

toolSelect.resetHot = function (type, event, mode) {
};
toolSelect.testHot = function (type, event, mode) {
    /*	if (mode != 'tool-select')
     return false;*/
    return this.hitTest(event);
};
toolSelect.hitTest = function (event) {
    var hitSize = 4.0; // / paper.view.zoom;
    this.hitItem = null;

    // Hit test items.
    if (event.point)
        this.hitItem = paper.project.hitTest(event.point, {fill: true, stroke: true, tolerance: hitSize});

    if (this.hitItem) {
        //if (this.hitItem.type) {
        //    console.log(this.hitItem)
        //}
        if (this.hitItem.type == 'fill'
            || this.hitItem.type == 'stroke'
            || this.hitItem.type == 'pixel') {
            if (this.hitItem.item.selected) {
                setCanvasCursor('cursor-arrow-small');
            } else {
                setCanvasCursor('cursor-arrow-black-shape');
            }
        }
    } else {
        setCanvasCursor('cursor-arrow-black');
    }

    return true;
};
toolSelect.on({
    activate: function () {
        $("#tools").children().removeClass("selected");
        $("#tool-select").addClass("selected");
        setCanvasCursor('cursor-arrow-black');
        updateSelectionState();
        showSelectionBounds();
    },
    deactivate: function () {
        hideSelectionBounds();
    },
    mousedown: function (event) {
        this.mode = null;
        this.changed = false;

        if (this.hitItem) {
            if (this.hitItem.type == 'fill'
                || this.hitItem.type == 'stroke'
                || this.hitItem.type == 'pixel') {
                if (event.modifiers.shift) {
                    this.hitItem.item.selected = !this.hitItem.item.selected;
                } else {
                    if (!this.hitItem.item.selected)
                        deselectAll();
                    this.hitItem.item.selected = true;
                }
                if (this.hitItem.item.selected) {
                    this.mode = 'move-shapes';
                    deselectAllPoints();
                    this.mouseStartPos = event.point.clone();
                    this.originalContent = captureSelectionState();
                }
            }
            updateSelectionState();
        } else {
            // Clicked on and empty area, engage box select.
            this.mouseStartPos = event.point.clone();
            this.mode = 'box-select';
        }
    },
    mouseup: function (event) {
        if (this.mode == 'move-shapes') {
            if (this.changed) {
                clearSelectionBounds();
                undo.snapshot("Move Shapes");
            }
            this.duplicates = null;
        } else if (this.mode == 'box-select') {
            var box = new paper.Rectangle(this.mouseStartPos, event.point);

            if (!event.modifiers.shift)
                deselectAll();

            var selectedPaths = getPathsIntersectingRect(box);
            for (var i = 0; i < selectedPaths.length; i++) {
                console.log(selectedPaths)
                //if (selectedPaths[i].guide)
                //    console.log("asdasd")
                selectedPaths[i].selected = !selectedPaths[i].selected;
            }
        }

        updateSelectionState();

        if (this.hitItem) {
            if (this.hitItem.item.selected) {
                setCanvasCursor('cursor-arrow-small');
            } else {
                setCanvasCursor('cursor-arrow-black-shape');
            }
        }
    },
    mousedrag: function (event) {
        if (this.mode == 'move-shapes') {

            this.changed = true;

            if (event.modifiers.option) {
                if (this.duplicates == null)
                    this.createDuplicates(this.originalContent);
                setCanvasCursor('cursor-arrow-duplicate');
            } else {
                if (this.duplicates)
                    this.removeDuplicates();
                setCanvasCursor('cursor-arrow-small');
            }

            var delta = event.point.subtract(this.mouseStartPos);
            if (event.modifiers.shift) {
                delta = snapDeltaToAngle(delta, Math.PI * 2 / 8);
            }

            restoreSelectionState(this.originalContent);

            var selected = paper.project.selectedItems;
            for (var i = 0; i < selected.length; i++) {
                selected[i].position = selected[i].position.add(delta);
            }
            updateSelectionState();
        } else if (this.mode == 'box-select') {
            dragRect(this.mouseStartPos, event.point);
        }
    },
    mousemove: function (event) {
        this.hitTest(event);
    }
});