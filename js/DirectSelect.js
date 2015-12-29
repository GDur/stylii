/**
 * Created by GDur on 29-Dec-15.
 */

var toolDirectSelect = new paper.Tool();
toolDirectSelect.mouseStartPos = new paper.Point();
toolDirectSelect.mode = null;
toolDirectSelect.hitItem = null;
toolDirectSelect.originalContent = null;
toolDirectSelect.originalHandleIn = null;
toolDirectSelect.originalHandleOut = null;
toolDirectSelect.changed = false;

toolDirectSelect.resetHot = function (type, event, mode) {
};
toolDirectSelect.testHot = function (type, event, mode) {
    if (mode != 'tool-direct-select')
        return;
    return this.hitTest(event);
};

toolDirectSelect.hitTest = function (event) {
    var hitSize = 5.0; // / paper.view.zoom;
    var hit = null;
    this.hitItem = null;

    // Hit test items.
    if (event.point)
        this.hitItem = paper.project.hitTest(event.point, {fill: true, stroke: true, tolerance: hitSize});

    // Hit test selected handles
    hit = null;
    if (event.point)
        hit = paper.project.hitTest(event.point, {selected: true, handles: true, tolerance: hitSize});
    if (hit)
        this.hitItem = hit;
    // Hit test points
    hit = null;
    if (event.point)
        hit = paper.project.hitTest(event.point, {segments: true, tolerance: hitSize});
    if (hit)
        this.hitItem = hit;

    if (this.hitItem) {
        if (this.hitItem.type == 'fill'
            || this.hitItem.type == 'stroke') {
            if (this.hitItem.item.selected) {
                setCanvasCursor('cursor-arrow-small');
            } else {
                setCanvasCursor('cursor-arrow-white-shape');
            }
        } else if (this.hitItem.type == 'segment' || this.hitItem.type == 'handle-in' || this.hitItem.type == 'handle-out') {
            if (this.hitItem.segment.selected) {
                setCanvasCursor('cursor-arrow-small-point');
            } else {
                setCanvasCursor('cursor-arrow-white-point');
            }
        }
    } else {
        setCanvasCursor('cursor-arrow-white');
    }

    return true;
};
toolDirectSelect.on({
    activate: function () {
        $("#tools").children().removeClass("selected");
        $("#tool-direct-select").addClass("selected");
        setCanvasCursor('cursor-arrow-white');
//		this.hitItem = null;
    },
    deactivate: function () {
//		this.clearSelectionBounds();
    },
    mousedown: function (event) {
        this.mode = null;
        this.changed = false;

        if (this.hitItem) {
            if (this.hitItem.type == 'fill' || this.hitItem.type == 'stroke') {
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
            } else if (this.hitItem.type == 'segment') {
                if (event.modifiers.shift) {
                    this.hitItem.segment.selected = !this.hitItem.segment.selected;
                } else {
                    if (!this.hitItem.segment.selected)
                        deselectAllPoints();
                    this.hitItem.segment.selected = true;
                }
                if (this.hitItem.segment.selected) {
                    this.mode = 'move-points';
                    this.mouseStartPos = event.point.clone();
                    this.originalContent = captureSelectionState();
                }
            } else if (this.hitItem.type == 'handle-in' || this.hitItem.type == 'handle-out') {
                this.mode = 'move-handle';
                this.mouseStartPos = event.point.clone();
                this.originalHandleIn = this.hitItem.segment.handleIn.clone();
                this.originalHandleOut = this.hitItem.segment.handleOut.clone();

                /*				if (this.hitItem.type == 'handle-out') {
                 this.originalHandlePos = this.hitItem.segment.handleOut.clone();
                 this.originalOppHandleLength = this.hitItem.segment.handleIn.length;
                 } else {
                 this.originalHandlePos = this.hitItem.segment.handleIn.clone();
                 this.originalOppHandleLength = this.hitItem.segment.handleOut.length;
                 }*/
//				this.originalContent = captureSelectionState(); // For some reason this does not work!
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
        } else if (this.mode == 'move-points') {
            if (this.changed) {
                clearSelectionBounds();
                undo.snapshot("Move Points");
            }
        } else if (this.mode == 'move-handle') {
            if (this.changed) {
                clearSelectionBounds();
                undo.snapshot("Move Handle");
            }
        } else if (this.mode == 'box-select') {
            var box = new paper.Rectangle(this.mouseStartPos, event.point);

            if (!event.modifiers.shift)
                deselectAll();

            var selectedSegments = getSegmentsInRect(box);
            if (selectedSegments.length > 0) {
                for (var i = 0; i < selectedSegments.length; i++) {
                    selectedSegments[i].selected = !selectedSegments[i].selected;
                }
            } else {
                var selectedPaths = getPathsIntersectingRect(box);
                for (var i = 0; i < selectedPaths.length; i++)
                    selectedPaths[i].selected = !selectedPaths[i].selected;
            }
        }

        updateSelectionState();

        if (this.hitItem) {
            if (this.hitItem.item.selected) {
                setCanvasCursor('cursor-arrow-small');
            } else {
                setCanvasCursor('cursor-arrow-white-shape');
            }
        }
    },
    mousedrag: function (event) {
        this.changed = true;
        if (this.mode == 'move-shapes') {
            setCanvasCursor('cursor-arrow-small');

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
        } else if (this.mode == 'move-points') {
            setCanvasCursor('cursor-arrow-small');

            var delta = event.point.subtract(this.mouseStartPos);
            if (event.modifiers.shift) {
                delta = snapDeltaToAngle(delta, Math.PI * 2 / 8);
            }
            restoreSelectionState(this.originalContent);

            var selected = paper.project.selectedItems;
            for (var i = 0; i < selected.length; i++) {
                var path = selected[i];
                for (var j = 0; j < path.segments.length; j++) {
                    if (path.segments[j].selected)
                        path.segments[j].point = path.segments[j].point.add(delta);
                }
            }
            updateSelectionState();
        } else if (this.mode == 'move-handle') {

            var delta = event.point.subtract(this.mouseStartPos);


            if (this.hitItem.type == 'handle-out') {
                var handlePos = this.originalHandleOut.add(delta);
                if (event.modifiers.shift) {
                    handlePos = snapDeltaToAngle(handlePos, Math.PI * 2 / 8);
                }
                this.hitItem.segment.handleOut = handlePos;

                if (event.modifiers.control)
                    this.hitItem.segment.handleIn = this.hitItem.segment.point.subtract(handlePos.add(this.hitItem.segment.point));

            } else {
                var handlePos = this.originalHandleIn.add(delta);
                if (event.modifiers.shift) {
                    handlePos = snapDeltaToAngle(handlePos, Math.PI * 2 / 8);
                }
                this.hitItem.segment.handleIn = handlePos;


                if (event.modifiers.control)
                    this.hitItem.segment.handleOut = this.hitItem.segment.point.subtract(handlePos.add(this.hitItem.segment.point));
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