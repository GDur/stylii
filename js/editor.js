var downloadAsSVG = function (fileName) {
    if (!fileName) {
        fileName = "stylii.svg"
    }
    var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString: true}));

    var link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.click();
}

var undo = null;

function setCanvasCursor(name) {
    $("#canvas").removeClass(function (index, css) {
        return (css.match(/\bcursor-\S+/g) || []).join(' ');
    }).addClass(name);
}

function snapDeltaToAngle(delta, snapAngle) {
    var angle = Math.atan2(delta.y, delta.x);
    angle = Math.round(angle / snapAngle) * snapAngle;
    var dirx = Math.cos(angle);
    var diry = Math.sin(angle);
    var d = dirx * delta.x + diry * delta.y;
    return new paper.Point(dirx * d, diry * d);
}

function indexFromAngle(angle) {
    var octant = Math.PI * 2 / 8;
    var index = Math.round(angle / octant);
    if (index < 0) index += 8;
    return index % 8;
}

var oppositeCorner = {
    'top-left': 'bottom-right',
    'top-center': 'bottom-center',
    'top-right': 'bottom-left',
    'right-center': 'left-center',
    'bottom-right': 'top-left',
    'bottom-center': 'top-center',
    'bottom-left': 'top-right',
    'left-center': 'right-center',
};

function setCanvasRotateCursor(dir, da) {
    // zero is up, counter clockwise
    var angle = Math.atan2(dir.x, -dir.y) + da;
    var index = indexFromAngle(angle);
    var cursors = [
        'cursor-rotate-0',
        'cursor-rotate-45',
        'cursor-rotate-90',
        'cursor-rotate-135',
        'cursor-rotate-180',
        'cursor-rotate-225',
        'cursor-rotate-270',
        'cursor-rotate-315'
    ];
    setCanvasCursor(cursors[index % 8]);
}

function setCanvasScaleCursor(dir) {
    // zero is up, counter clockwise
    var angle = Math.atan2(dir.x, -dir.y);
    var index = indexFromAngle(angle);
    var cursors = [
        'cursor-scale-0',
        'cursor-scale-45',
        'cursor-scale-90',
        'cursor-scale-135'
    ];
    setCanvasCursor(cursors[index % 4]);
}

function dragRect(p1, p2) {
    // Create pixel perfect dotted rectable for drag selections.
    var half = new paper.Point(0.5 / paper.view.zoom, 0.5 / paper.view.zoom);
    var start = p1.add(half);
    var end = p2.add(half);
    var rect = new paper.CompoundPath();
    rect.moveTo(start);
    rect.lineTo(new paper.Point(start.x, end.y));
    rect.lineTo(end);
    rect.moveTo(start);
    rect.lineTo(new paper.Point(end.x, start.y));
    rect.lineTo(end);
    rect.strokeColor = 'black';
    rect.strokeWidth = 1.0 / paper.view.zoom;
    rect.dashOffset = 0.5 / paper.view.zoom;
    rect.dashArray = [1.0 / paper.view.zoom, 1.0 / paper.view.zoom];
    rect.removeOn({
        drag: true,
        up: true
    });
    rect.guide = true;
    return rect;
}

function findItemById(id) {
    if (id == -1) return null;
    function findItem(item) {
        if (item.id == id)
            return item;
        if (item.children) {
            for (var j = item.children.length - 1; j >= 0; j--) {
                var it = findItem(item.children[j]);
                if (it != null)
                    return it;
            }
        }
        return null;
    }

    for (var i = 0, l = paper.project.layers.length; i < l; i++) {
        var layer = paper.project.layers[i];
        var it = findItem(layer);
        if (it != null)
            return it;
    }
    return null;
}


var clipboard = null;
var selectionBounds = null;
var selectionBoundsShape = null;
var drawSelectionBounds = 0;

function clearSelectionBounds() {
    if (selectionBoundsShape)
        selectionBoundsShape.remove();
    selectionBoundsShape = null;
    selectionBounds = null;
};

function showSelectionBounds() {
    drawSelectionBounds++;
    if (drawSelectionBounds > 0) {
        if (selectionBoundsShape)
            selectionBoundsShape.visible = true;
    }
}

function hideSelectionBounds() {
    if (drawSelectionBounds > 0)
        drawSelectionBounds--;
    if (drawSelectionBounds == 0) {
        if (selectionBoundsShape)
            selectionBoundsShape.visible = false;
    }
}

function updateSelectionState() {
    clearSelectionBounds();
    selectionBounds = getSelectionBounds();
    if (selectionBounds != null) {
        var rect = new paper.Path.Rectangle(selectionBounds);
        //var color = paper.project.activeLayer.getSelectedColor();
        rect.strokeColor = 'rgba(0,0,0,0)'; //color ? color : '#009dec';
        rect.strokeWidth = 1.0 / paper.view.zoom;
//		rect._boundsSelected = true;
        rect.selected = true;
        rect.setFullySelected(true);
        rect.guide = true;
        rect.visible = drawSelectionBounds > 0;
//		rect.transformContent = false;
        selectionBoundsShape = rect;
    }
    updateSelectionUI();
}

function toRGBAString(color) {
    if (!color)
        return
    var colorString = ["rgba(", color._r, ",", color._g, ",", color._b, ",", color._a, ")"].join("")
    return colorString
}
function updateSelectionUI() {
    var selected = paper.project.selectedItems;

    var fillColor = ""
    var strokeColor = ""
    if (selected.length > 0)
        console.log("selected", selected)

    if (selected.length === 2) {
        if (selected[0].fillColor)
            fillColor = selected[0].fillColor._canvasStyle

        if (selected[0].strokeColor)
            strokeColor = selected[0].strokeColor._canvasStyle
    }
    $("#fill-color").spectrum("set", fillColor);
    $("#stroke-color").spectrum("set", strokeColor);

    if (selectionBounds == null) {
        $("#cut").addClass("disabled");
        $("#copy").addClass("disabled");
        $("#delete").addClass("disabled");
    } else {
        $("#cut").removeClass("disabled");
        $("#copy").removeClass("disabled");
        $("#delete").removeClass("disabled");
    }

    if (clipboard == null) {
        $("#paste").addClass("disabled");
    } else {
        $("#paste").removeClass("disabled");
    }
}

function cutSelection() {
    clipboard = captureSelectionState();
    var selected = paper.project.selectedItems;
    for (var i = 0; i < selected.length; i++) {
        selected[i].remove();
    }
    undo.snapshot("Cut");
}

function copySelection() {
    clipboard = captureSelectionState();
    updateSelectionState();
}

function pasteSelection() {
    if (clipboard == null)
        return;

    deselectAll();

    var items = [];
    for (var i = 0; i < clipboard.length; i++) {
        var content = clipboard[i];
        var item = paper.Base.importJSON(content.json);
        if (item) {
            item.selected = true;
            items.push(item);
        }
    }

    // Center pasted items to center of the view
    var bounds = null;
    for (var i = 0; i < items.length; i++) {
        if (bounds == null)
            bounds = items[i].bounds.clone();
        else
            bounds = bounds.unite(items[i].bounds);
    }
    if (bounds) {
        var delta = paper.view.center.subtract(bounds.center);
        for (var i = 0; i < items.length; i++) {
            items[i].position = items[i].position.add(delta);
        }
    }

    undo.snapshot("Paste");

    updateSelectionState();
    paper.project.view.update();
}

function deleteSelection() {
    var selected = paper.project.selectedItems;
    for (var i = 0; i < selected.length; i++)
        selected[i].remove();

    undo.snapshot("Delete");

    updateSelectionState();
    paper.project.view.update();
}

// Returns serialized contents of selected items. 
function captureSelectionState() {
    var originalContent = [];
    var selected = paper.project.selectedItems;
    for (var i = 0; i < selected.length; i++) {
        var item = selected[i];
        if (item.guide) continue;
        var orig = {
            id: item.id,
            json: item.exportJSON({asString: false}),
            selectedSegments: []
        };
        originalContent.push(orig);
    }
    return originalContent;
}

// Restore the state of selected items.
function restoreSelectionState(originalContent) {
    // TODO: could use findItemById() instead.
    for (var i = 0; i < originalContent.length; i++) {
        var orig = originalContent[i];
        var item = findItemById(orig.id);
        if (!item) continue;
        // HACK: paper does not retain item IDs after importJSON,
        // store the ID here, and restore after deserialization.
        var id = item.id;
        item.importJSON(orig.json);
        item._id = id;
    }
}

function deselectAll() {
    paper.project.deselectAll();
}

function deselectAllPoints() {
    var selected = paper.project.selectedItems;
    for (var i = 0; i < selected.length; i++) {
        var item = selected[i];
        if (item instanceof paper.Path) {
            for (var j = 0; j < item.segments.length; j++)
                if (item.segments[j].selected)
                    item.segments[j].selected = false;
        }
    }
}

// Returns path points which are contained in the rect. 
function getSegmentsInRect(rect) {
    var segments = [];

    function checkPathItem(item) {
        if (item._locked || !item._visible || item._guide)
            return;
        var children = item.children;
        if (!rect.intersects(item.bounds))
            return;
        if (item instanceof paper.Path) {
            for (var i = 0; i < item.segments.length; i++) {
                if (rect.contains(item.segments[i].point))
                    segments.push(item.segments[i]);
            }
        } else {
            if (children && children.length > 0)
                for (var j = children.length - 1; j >= 0; j--)
                    checkPathItem(children[j]);
        }
    }

    for (var i = paper.project.layers.length - 1; i >= 0; i--) {
        checkPathItem(paper.project.layers[i]);
    }

    return segments;
}

// Returns all items intersecting the rect.
// Note: only the item outlines are tested.
function getPathsIntersectingRect(rect) {
    var paths = [];
    var boundingRect = new paper.Path.Rectangle(rect);

    function checkPathItem(item) {
        var children = item.children;
        if (item.equals(boundingRect))
            return;
        if (!rect.intersects(item.bounds))
            return;
        if (item instanceof paper.PathItem) {
            if (rect.contains(item.bounds)) {
                paths.push(item);
                return;
            }
            var isects = boundingRect.getIntersections(item);
            if (isects.length > 0)
                paths.push(item);
        } else {
            if (children && children.length > 0)
                for (var j = children.length - 1; j >= 0; j--)
                    checkPathItem(children[j]);
        }
    }

    for (var i = 0, l = paper.project.layers.length; i < l; i++) {
        var layer = paper.project.layers[i];
        checkPathItem(layer);
    }

    boundingRect.remove();
    return paths;
}

// Returns bounding box of all selected items.
function getSelectionBounds() {
    var bounds = null;
    var selected = paper.project.selectedItems;
    for (var i = 0; i < selected.length; i++) {
        if (bounds == null)
            bounds = selected[i].bounds.clone();
        else
            bounds = bounds.unite(selected[i].bounds);
    }
    return bounds;
}

//setInterval(function () {
//
//    console.log(paper.project.layers[0],
//        "paper.view.zoom:", paper.view.zoom
//    )
//
//    visitItem(paper.project.layers[0])
//    function visitItem(item) {
//        if (item.children && item.children.length > 0) {
//            for (var j = item.children.length - 1; j >= 0; j--) {
//                console.log(item.children[j])
//                visitItem(item.children[j]);
//
//            }
//        }
//    }
//}, 3000)

$(document).ready(function () {
    var $canvas = $('#canvas');
    paper.setup($canvas[0]);

    // HACK: Do not select the children of layers, or else
    // the layers of selected objects will become selected
    // after importJSON().
    paper.Layer.inject({
        _selectChildren: false
    });

    undo = new Undo(20);

    var path1 = new paper.Path.Circle(new paper.Point(130, 270), 60);
    path1.strokeColor = 'black';

    var path2 = new paper.Path.Circle(new paper.Point(130, 160), 40);
    path2.fillColor = 'rgba(0, 138, 255, 0.52)';
    path2.selected = true

    var text = new paper.PointText(new paper.Point(130, 370));
    text.justification = 'center';
    text.fillColor = 'black';
    text.content = 'The contents of the point text';
    var path3 = new paper.CompoundPath({
        children: [
            new paper.Path.Circle({
                center: new paper.Point(50, 50),
                radius: 30
            }),
            new paper.Path.Circle({
                center: new paper.Point(60, 50),
                radius: 10
            })
        ],
        fillColor: 'black',
        selected: true
    });
    undo.snapshot("Init");

    $("#tool-select").click(function () {
        toolStack.setToolMode('tool-select');
    });
    $("#tool-direct-select").click(function () {
        toolStack.setToolMode('tool-direct-select');
    });
    $("#tool-pen").click(function () {
        toolStack.setToolMode('tool-pen');
    });
    $("#tool-zoompan").click(function () {
        toolStack.setToolMode('tool-zoompan');
    });

    $("#undo").click(function () {
        toolStack.command(function () {
            if (undo.canUndo())
                undo.undo();
        });
    });
    $("#redo").click(function () {
        toolStack.command(function () {
            if (undo.canRedo())
                undo.redo();
        });
    });

    $("#cut").click(function () {
        cutSelection();
    });
    $("#copy").click(function () {
        copySelection();
    });
    $("#paste").click(function () {
        pasteSelection();
    });

    $("#delete").click(function () {
        deleteSelection();
    });

    $("#save-as-svg").click(function () {
        downloadAsSVG();
    });

    function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object

        // Loop through the FileList and render image files as thumbnails.
        for (var i = 0, f; f = files[i]; i++) {

            // Only process image files.
            if (!f.type.match('image.*')) {
                continue;
            }

            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function (theFile) {
                return function (e) {
                    // Render thumbnail.
                    var span = document.createElement('span');
                    span.innerHTML = [
                        '<img class="thumb" src="', e.target.result,
                        '" title="', escape(theFile.name),
                        '" id="', escape(theFile.name),
                        '" style="display:none',
                        '"/>'
                    ].join('');
                    document.getElementById('list').insertBefore(span, null);

                    insertImage(escape(theFile.name));
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsDataURL(f);
        }
    }

    function insertImage(name) {
        var raster = new paper.Raster(name);
        raster.position = [Math.round(paper.view.center.x), Math.round(paper.view.center.y)];
    }

    document.getElementById('files').addEventListener('change', handleFileSelect, false);

    $("#fill-color").spectrum({
        color: "rgba(0, 128, 255, 0.66)",
        preferredFormat: "rgb",
        showInput: true,
        allowEmpty: true,
        showAlpha: true,
        showInitial: true,
        localStorageKey: "spectrum.homepage",
        showPalette: true,
        showSelectionPalette: true,
        palette: [
            ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
            ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
            ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
            ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
            ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
            ["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
            ["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
            ["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
        ],
        move: function (color) {
            var selected = paper.project.selectedItems;
            for (var i = 0; i < selected.length; i++) {
                if (selected[i].guide)
                    continue;
                selected[i].fillColor = toRGBAString(color)
            }
            paper.view.draw();
        }
    });
    $("#stroke-color").spectrum({
        color: "rgba(0, 128, 255, 0.66)",
        preferredFormat: "rgb",
        showInput: true,
        allowEmpty: true,
        showAlpha: true,
        showInitial: true,
        showPalette: true,
        showSelectionPalette: true,
        //palette: [
        //    ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
        //    ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
        //    ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
        //    ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
        //    ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
        //    ["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
        //    ["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
        //    ["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]],
        //localStorageKey: "spectrum.homepage",
        move: function (color) {
            var selected = paper.project.selectedItems;
            for (var i = 0; i < selected.length; i++) {
                if (selected[i].guide)
                    continue;
                selected[i].strokeColor = toRGBAString(color)
            }
            paper.view.draw();
        }
    });

    toolStack.activate();
    toolStack.setToolMode('tool-direct-select');
    $(window).resize(resizeAndRedrawCanvas);

    paper.view.desiredWidth = 600; //$(window).width();
    paper.view.desiredHeight = 400; //$('#canvasContainer').height();
    function resizeAndRedrawCanvas() {

        canvas.width = paper.view.desiredWidth * paper.view.zoom
        canvas.height = paper.view.desiredHeight * paper.view.zoom

        paper.view.viewSize = new paper.Size(paper.view.desiredWidth * paper.view.zoom, paper.view.desiredHeight * paper.view.zoom);
        paper.view.draw();
    }

    paper.view.viewSize = new paper.Size(paper.view.desiredWidth, paper.view.desiredHeight);

    paper.view.draw();
});

