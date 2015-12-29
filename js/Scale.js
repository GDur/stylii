/**
 * Created by GDur on 29-Dec-15.
 */

var toolScale = new paper.Tool();
toolScale.mouseStartPos = new paper.Point();
toolScale.mode = null;
toolScale.hitItem = null;
toolScale.pivot = null;
toolScale.corner = null;
toolScale.originalCenter = null;
toolScale.originalSize = null;
toolScale.originalContent = null;
toolScale.changed = false;

toolScale.resetHot = function (type, event, mode) {
};
toolScale.testHot = function (type, event, mode) {
    /*	if (mode != 'tool-select')
     return false;*/
    return this.hitTest(event);
};

toolScale.hitTest = function (event) {
    var hitSize = 6.0; // / paper.view.zoom;
    this.hitItem = null;

    if (!selectionBoundsShape || !selectionBounds)
        updateSelectionState();

    if (!selectionBoundsShape || !selectionBounds)
        return;

    // Hit test selection rectangle
    if (event.point)
        this.hitItem = selectionBoundsShape.hitTest(event.point, {bounds: true, guides: true, tolerance: hitSize});

    if (this.hitItem && this.hitItem.type == 'bounds') {
        // Normalize the direction so that corners are at 45° angles.
        var dir = event.point.subtract(selectionBounds.center);
        dir.x /= selectionBounds.width * 0.5;
        dir.y /= selectionBounds.height * 0.5;
        setCanvasScaleCursor(dir);
        return true;
    }

    return false;
};

toolScale.on({
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
                this.mode = 'scale';
                var pivotName = paper.Base.camelize(oppositeCorner[this.hitItem.name]);
                var cornerName = paper.Base.camelize(this.hitItem.name);
                this.pivot = selectionBounds[pivotName].clone();
                this.corner = selectionBounds[cornerName].clone();
                this.originalSize = this.corner.subtract(this.pivot);
                this.originalCenter = selectionBounds.center;
            }
            updateSelectionState();
        }
    },
    mouseup: function (event) {
        if (this.mode == 'scale') {
            if (this.changed) {
                clearSelectionBounds();
                undo.snapshot("Scale Shapes");
            }
        }
    },
    mousedrag: function (event) {
        if (this.mode == 'scale') {
            var pivot = this.pivot;
            var originalSize = this.originalSize;

            if (event.modifiers.option) {
                pivot = this.originalCenter;
                originalSize = originalSize.multiply(0.5);
            }

            this.corner = this.corner.add(event.delta);
            var size = this.corner.subtract(pivot);
            var sx = 1.0, sy = 1.0;
            if (Math.abs(originalSize.x) > 0.0000001)
                sx = size.x / originalSize.x;
            if (Math.abs(originalSize.y) > 0.0000001)
                sy = size.y / originalSize.y;

            if (event.modifiers.shift) {
                var signx = sx > 0 ? 1 : -1;
                var signy = sy > 0 ? 1 : -1;
                sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
                sx *= signx;
                sy *= signy;
            }

            restoreSelectionState(this.originalContent);

            var selected = paper.project.selectedItems;
            for (var i = 0; i < selected.length; i++) {
                var item = selected[i];
                if (item.guide) continue;
                item.scale(sx, sy, pivot);
            }
            updateSelectionState();
            this.changed = true;
        }
    },
    mousemove: function (event) {
        this.hitTest(event);
    }
});
