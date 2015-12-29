/**
 * Created by GDur on 29-Dec-15.
 */


var toolRotate = new paper.Tool();
toolRotate.mouseStartPos = new paper.Point();
toolRotate.mode = null;
toolRotate.hitItem = null;
toolRotate.originalCenter = null;
toolRotate.originalAngle = 0;
toolRotate.originalContent = null;
toolRotate.originalShape = null;
toolRotate.cursorDir = null;
toolRotate.changed = false;


toolRotate.resetHot = function (type, event, mode) {
};
toolRotate.testHot = function (type, event, mode) {
    /*	if (mode != 'tool-select')
     return false;*/
    return this.hitTest(event);
};

toolRotate.hitTest = function (event) {
    var hitSize = 12.0; // / paper.view.zoom;
    this.hitItem = null;

    if (!selectionBoundsShape || !selectionBounds)
        updateSelectionState();

    if (!selectionBoundsShape || !selectionBounds)
        return;

    // Hit test selection rectangle
    this.hitItem = null;
    if (event.point && !selectionBounds.contains(event.point))
        this.hitItem = selectionBoundsShape.hitTest(event.point, {bounds: true, guides: true, tolerance: hitSize});

    if (this.hitItem && this.hitItem.type == 'bounds') {
        // Normalize the direction so that corners are at 45° angles.
        var dir = event.point.subtract(selectionBounds.center);
        dir.x /= selectionBounds.width * 0.5;
        dir.y /= selectionBounds.height * 0.5;
        setCanvasRotateCursor(dir, 0);
        toolRotate.cursorDir = dir;
        return true;
    }

    return false;
};

toolRotate.on({
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
            if (this.hitItem.type == 'bounds') {
                this.originalContent = captureSelectionState();
                this.originalShape = selectionBoundsShape.exportJSON({asString: false});
                this.mode = 'rotate';
                this.originalCenter = selectionBounds.center.clone();
                var delta = event.point.subtract(this.originalCenter);
                this.originalAngle = Math.atan2(delta.y, delta.x);
            }
            updateSelectionState();
        }
    },
    mouseup: function (event) {
        if (this.mode == 'rotate') {
            if (this.changed) {
                clearSelectionBounds();
                undo.snapshot("Rotate Shapes");
            }
        }
        updateSelectionState();
    },
    mousedrag: function (event) {
        if (this.mode == 'rotate') {

            var delta = event.point.subtract(this.originalCenter);
            var angle = Math.atan2(delta.y, delta.x);
            var da = angle - this.originalAngle;

            if (event.modifiers.shift) {
                var snapeAngle = Math.PI / 4;
                da = Math.round(da / snapeAngle) * snapeAngle;
            }

            restoreSelectionState(this.originalContent);

            var id = selectionBoundsShape.id;
            selectionBoundsShape.importJSON(this.originalShape);
            selectionBoundsShape._id = id;

            var deg = da / Math.PI * 180;

            selectionBoundsShape.rotate(deg, this.originalCenter);

            var selected = paper.project.selectedItems;
            for (var i = 0; i < selected.length; i++) {
                var item = selected[i];
                if (item.guide) continue;
                item.rotate(deg, this.originalCenter);
            }

            setCanvasRotateCursor(toolRotate.cursorDir, da);
            this.changed = true;
        }
    },
    mousemove: function (event) {
        this.hitTest(event);
    }
});
