/**
 * Created by GDur on 29-Dec-15.
 */

var toolPen = new paper.Tool();
toolPen.pathId = -1;
toolPen.hitResult = null;
toolPen.mouseStartPos = null;
toolPen.originalHandleIn = null;
toolPen.originalHandleOut = null;
toolPen.currentSegment = null;

toolPen.closePath = function () {
    if (this.pathId != -1) {
        deselectAllPoints();

        this.pathId = -1;
    }
};
toolPen.updateTail = function (point) {
    var path = findItemById(this.pathId);
    if (path == null)
        return;
    var nsegs = path.segments.length;
    if (nsegs == 0)
        return;

    var color = paper.project.activeLayer.getSelectedColor();
    var tail = new paper.Path();
    tail.strokeColor = color ? color : '#009dec';
    tail.strokeWidth = 1.0 / paper.view.zoom;
    tail.guide = true;

    var prevPoint = path.segments[nsegs - 1].point;
    var prevHandleOut = path.segments[nsegs - 1].point.add(path.segments[nsegs - 1].handleOut);

    tail.moveTo(prevPoint);
    if (this.mode == 'close')
        tail.cubicCurveTo(prevHandleOut, path.segments[0].handleIn.add(path.segments[0].point), point);
    else
        tail.cubicCurveTo(prevHandleOut, point, point);

    tail.removeOn({
        drag: true,
        up: true,
        down: true,
        move: true
    });
}
toolPen.resetHot = function (type, event, mode) {
};
toolPen.testHot = function (type, event, mode) {
    if (mode != 'tool-pen')
        return false;
    if (event.modifiers.command)
        return false;
    if (type == 'keyup') {
        if (event.key == 'enter' || event.key == 'escape') {
            this.closePath();
        }
    }
    return this.hitTest(event, type);
};
toolPen.hitTest = function (event, type) {
    var hitSize = 4.0; // / paper.view.zoom;
    var result = null;
//	var isKeyEvent = type == 'mode' || type == 'command' || type == 'keydown' || type == 'keyup';

    this.currentSegment = null;
    this.hitResult = null;

    if (event.point)
        result = paper.project.hitTest(event.point, {segments: true, stroke: true, tolerance: hitSize});

    if (result) {
        if (result.type == 'stroke') {
            if (result.item.selected) {
                // Insert point.
                this.mode = 'insert';
                setCanvasCursor('cursor-pen-add');
            } else {
                result = null;
            }
        } else if (result.type == 'segment') {
            var last = result.item.segments.length - 1;
            if (!result.item.closed && (result.segment.index == 0 || result.segment.index == last)) {
                if (result.item.id == this.pathId) {
                    if (result.segment.index == 0) {
                        // Close
                        this.mode = 'close';
                        setCanvasCursor('cursor-pen-close');
                        this.updateTail(result.segment.point);
                    } else {
                        // Adjust last handle
                        this.mode = 'adjust';
                        setCanvasCursor('cursor-pen-adjust');
                    }
                } else {
                    if (this.pathId != -1) {
                        this.mode = 'join';
                        setCanvasCursor('cursor-pen-join');
                        this.updateTail(result.segment.point);
                    } else {
                        this.mode = 'continue';
                        setCanvasCursor('cursor-pen-edit');
                    }
                }
            } else if (result.item.selected) {
                if (event.modifiers.option) {
                    this.mode = 'convert';
                    setCanvasCursor('cursor-pen-adjust');
                } else {
                    this.mode = 'remove';
                    setCanvasCursor('cursor-pen-remove');
                }
            } else {
                result = null;
            }
        }
    }

    if (!result || result.type == 'pixel') {
        this.mode = 'create';
        setCanvasCursor('cursor-pen-create');
        if (event.point)
            this.updateTail(event.point);
    }

    this.hitResult = result;

    return true;
};
toolPen.on({
    activate: function () {
        $("#tools").children().removeClass("selected");
        $("#tool-pen").addClass("selected");
        setCanvasCursor('cursor-pen-add');
    },
    deactivate: function () {
        if (toolStack.mode != 'tool-pen') {
            this.closePath();
            updateSelectionState();
        }
        this.currentSegment = null;
    },
    mousedown: function (event) {
        //
        //if (event.event.which === 3) {
        //    console.log("sdf")
        //    this.mode = 'close'
        //    //this.closePath();
        //}
        deselectAllPoints();

        if (this.mode == 'create') {
            var path = findItemById(this.pathId);
            if (path == null) {
                deselectAll();
                path = new paper.Path();
                path.strokeColor = 'black';
                this.pathId = path.id;
            }
            this.currentSegment = path.add(event.point);

            this.mouseStartPos = event.point.clone();
            this.originalHandleIn = this.currentSegment.handleIn.clone();
            this.originalHandleOut = this.currentSegment.handleOut.clone();

        } else if (this.mode == 'insert') {
            if (this.hitResult != null) {
                var location = this.hitResult.location;

                var values = location.curve.getValues();
                var isLinear = location.curve.isLinear();
                var parts = paper.Curve.subdivide(values, location.parameter);
                var left = parts[0];
                var right = parts[1];

                var x = left[6], y = left[7];
                var segment = new paper.Segment(new paper.Point(x, y),
                    !isLinear && new paper.Point(left[4] - x, left[5] - y),
                    !isLinear && new paper.Point(right[2] - x, right[3] - y));

                var seg = this.hitResult.item.insert(location.index + 1, segment);

                if (!isLinear) {
                    seg.previous.handleOut.set(left[2] - left[0], left[3] - left[1]);
                    seg.next.handleIn.set(right[4] - right[6], right[5] - right[7]);
                }

                deselectAllPoints();
                seg.selected = true;

                this.hitResult = null;
            }

        } else if (this.mode == 'close') {

            if (this.pathId != -1) {
                var path = findItemById(this.pathId);
                path.closed = true;
                //blub
                //var path = findItemById(this.pathId);
                path.fillColor = 'grey';
            }

            this.currentSegment = this.hitResult.segment;

            this.mouseStartPos = event.point.clone();
            this.originalHandleIn = this.currentSegment.handleIn.clone();
            this.originalHandleOut = this.currentSegment.handleOut.clone();

        } else if (this.mode == 'adjust') {

            this.currentSegment = this.hitResult.segment;
            this.currentSegment.handleOut.set(0, 0);

            this.mouseStartPos = event.point.clone();
            this.originalHandleIn = this.currentSegment.handleIn.clone();
            this.originalHandleOut = this.currentSegment.handleOut.clone();

        } else if (this.mode == 'continue') {

            if (this.hitResult.segment.index == 0)
                this.hitResult.item.reverse();

            this.pathId = this.hitResult.item.id;
            this.currentSegment = this.hitResult.segment;
            this.currentSegment.handleOut.set(0, 0);

            this.mouseStartPos = event.point.clone();
            this.originalHandleIn = this.currentSegment.handleIn.clone();
            this.originalHandleOut = this.currentSegment.handleOut.clone();

        } else if (this.mode == 'convert') {

            this.pathId = this.hitResult.item.id;
            this.currentSegment = this.hitResult.segment;
            this.currentSegment.handleIn.set(0, 0);
            this.currentSegment.handleOut.set(0, 0);

            this.mouseStartPos = event.point.clone();
            this.originalHandleIn = this.currentSegment.handleIn.clone();
            this.originalHandleOut = this.currentSegment.handleOut.clone();

        } else if (this.mode == 'join') {

            var path = findItemById(this.pathId);
            if (path != null) {
                var oldPoint = this.hitResult.segment.point.clone();
                if (this.hitResult.segment.index != 0)
                    this.hitResult.item.reverse();
                path.join(this.hitResult.item);
                // Find nearest point to the hit point.
                var imin = -1;
                var dmin = 0;
                for (var i = 0; i < path.segments.length; i++) {
                    var d = oldPoint.getDistance(path.segments[i].point);
                    if (imin == -1 || d < dmin) {
                        dmin = d;
                        imin = i;
                    }
                }
                this.currentSegment = path.segments[imin];
                this.currentSegment.handleIn.set(0, 0);

                this.mouseStartPos = event.point.clone();
                this.originalHandleIn = this.currentSegment.handleIn.clone();
                this.originalHandleOut = this.currentSegment.handleOut.clone();
            } else {
                this.currentSegment = -1;
            }

        } else if (this.mode == 'remove') {
            if (this.hitResult != null) {
                this.hitResult.item.removeSegment(this.hitResult.segment.index);
                this.hitResult = null;
            }
        }

        // select handleOut of previous segment too
        if (this.currentSegment.index > 0)
            this.currentSegment.path.segments[this.currentSegment.index - 1].handleOut.selected = true

        // select newest segment
        if (this.currentSegment)
            this.currentSegment.selected = true;
    },
    mouseup: function (event) {
        if (this.mode == 'close') {
            this.closePath();
        } else if (this.mode == 'join') {
            this.closePath();
        } else if (this.mode == 'convert') {
            this.closePath();
        }
        undo.snapshot("Pen");
        this.mode = null;
        this.currentSegment = null;
    },
    mousedrag: function (event) {
        if (this.currentSegment == null)
            return;
        var path = findItemById(this.pathId);
        if (path == null)
            return;

        var dragIn = false;
        var dragOut = false;
        var invert = false;

        if (this.mode == 'create') {
            dragOut = true;
            dragIn = true;
        } else if (this.mode == 'close') {
            dragIn = true;
            invert = true;
        } else if (this.mode == 'continue') {
            dragOut = true;
        } else if (this.mode == 'adjust') {
            dragOut = true;
        } else if (this.mode == 'join') {
            dragIn = true;
            invert = true;
        } else if (this.mode == 'convert') {
            dragIn = true;
            dragOut = true;
        }

        if (dragIn || dragOut) {
            var delta = event.point.subtract(this.mouseStartPos);
            if (invert)
                delta = delta.negate();
            if (dragIn && dragOut) {
                var handlePos = this.originalHandleOut.add(delta);
                if (event.modifiers.shift)
                    handlePos = snapDeltaToAngle(handlePos, Math.PI * 2 / 8);
                this.currentSegment.handleOut = handlePos;
                this.currentSegment.handleIn = handlePos.negate();
            } else if (dragOut) {
                var handlePos = this.originalHandleOut.add(delta);
                if (event.modifiers.shift)
                    handlePos = snapDeltaToAngle(handlePos, Math.PI * 2 / 8);
                this.currentSegment.handleOut = handlePos;
                this.currentSegment.handleIn = handlePos.normalize(-this.originalHandleIn.length);
            } else {
                var handlePos = this.originalHandleIn.add(delta);
                if (event.modifiers.shift)
                    handlePos = snapDeltaToAngle(handlePos, Math.PI * 2 / 8);
                this.currentSegment.handleIn = handlePos;
                this.currentSegment.handleOut = handlePos.normalize(-this.originalHandleOut.length);
            }
        }

    },
    mousemove: function (event) {
        this.hitTest(event);
    }
});
