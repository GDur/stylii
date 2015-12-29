/**
 * Created by GDur on 29-Dec-15.
 */

var toolZoomPan = new paper.Tool();
toolZoomPan.distanceThreshold = 8;
toolZoomPan.mouseStartPos = new paper.Point();
toolZoomPan.mode = 'pan';
toolZoomPan.zoomFactor = 1.3;
toolZoomPan.resetHot = function (type, event, mode) {
};
toolZoomPan.testHot = function (type, event, mode) {
    var spacePressed = event && event.modifiers.space;
    if (mode != 'tool-zoompan' && !spacePressed)
        return false;
    return this.hitTest(event);
};
toolZoomPan.hitTest = function (event) {
    if (event.modifiers.shift) {
        if (event.modifiers.shift && !event.modifiers.option) {
            setCanvasCursor('cursor-zoom-in');
        } else if (event.modifiers.shift && event.modifiers.option) {
            setCanvasCursor('cursor-zoom-out');
        }
    } else {
        setCanvasCursor('cursor-hand');
    }
    return true;
};
toolZoomPan.on({
    activate: function () {
        $("#tools").children().removeClass("selected");
        $("#tool-zoompan").addClass("selected");
        setCanvasCursor('cursor-hand');
    },
    deactivate: function () {
    },
    mousedown: function (event) {
        this.mouseStartPos = event.point.subtract(paper.view.center);
        this.mode = '';
        if (event.modifiers.shift) {
            this.mode = 'zoom';
        } else {
            //setCanvasCursor('cursor-hand-grab');
            this.mode = 'pan';
        }
    },
    mouseup: function (event) {
        if (this.mode == 'zoom') {
            var zoomCenter = event.point.subtract(paper.view.center);
            var moveFactor = this.zoomFactor - 1.0;
            if (event.modifiers.shift && !event.modifiers.option) {
                paper.view.zoom *= this.zoomFactor;
                paper.view.center = paper.view.center.add(zoomCenter.multiply(moveFactor / this.zoomFactor));
            } else if (event.modifiers.shift && event.modifiers.option) {
                paper.view.zoom /= this.zoomFactor;
                paper.view.center = paper.view.center.subtract(zoomCenter.multiply(moveFactor));
            }
        } else if (this.mode == 'zoom-rect') {
            var start = paper.view.center.add(this.mouseStartPos);
            var end = event.point;
            paper.view.center = start.add(end).multiply(0.5);
            var dx = paper.view.bounds.width / Math.abs(end.x - start.x);
            var dy = paper.view.bounds.height / Math.abs(end.y - start.y);
            paper.view.zoom = Math.min(dx, dy) * paper.view.zoom;
        }
        this.hitTest(event);
        this.mode = '';
    },
    mousedrag: function (event) {
        if (this.mode == 'zoom') {
            setCanvasCursor('cursor-zoom-in');
            // If dragging mouse while in zoom mode, switch to zoom-rect instead.
            this.mode = 'zoom-rect';
        } else if (this.mode == 'zoom-rect') {
            // While dragging the zoom rectangle, paint the selected area.
            dragRect(paper.view.center.add(this.mouseStartPos), event.point);
        } else if (this.mode == 'pan') {
            // Handle panning by moving the view center.
            var pt = event.point.subtract(paper.view.center);
            var delta = this.mouseStartPos.subtract(pt);
            paper.view.scrollBy(delta);
            this.mouseStartPos = pt;
        }
    },

    mousemove: function (event) {
        this.hitTest(event);
    },

    keydown: function (event) {
        this.hitTest(event);
    },

    keyup: function (event) {
        this.hitTest(event);
    }
});
