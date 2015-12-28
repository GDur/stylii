# Stylii
 - a vector program for the web.
 - GDur: "I contribute to this project with the aim to create a clean and userfriendly vector program for the web, which can load background images and is able to create and edit bezier lines."
 
DEMO
==
 [stylii live demo](https://dl.dropboxusercontent.com/u/8938703/workspace/web/stylii/editor.html)

How to use
==
 - Hotkey Modifiers
  - Bezier HandlerIn and Handler Our: control=mirror, shift=45° angle snap

TODO ordered by priority (might change suddenly)
==
  - [x] pressing control will cause handler mirroring
  - [x] creating a path will create a handlerIn too
  - [x] image TODO
    - [x] upload/insert
    - [x] make selectable (hence movable, rotatable and scalable)
  - [x] export/save as svg
  - [x] make use of the material lite design (mdl)
  - [x] add color chooser module
  - [x] add live demo link to repo
  - [x] path TODO
    - [x] fill option for closed path's
  - [ ] refactor / split editor.js into multiple modular files 
  - [ ] fix bug when creating bezier on top of image
  - [ ] import/load an svg-file
  - [ ] add property panel with styling options
  - [ ] lazy load and save to localstorage
  - [ ] stroke TODO
    - [ ] adjustable width
    - [x] adjustable color
  - [ ] layers
    - [ ] show layers
    - [ ] later - make use of folder structure and drag and drop stuff
  - [ ] add library which can assign a hotkey to each button
  - [ ] add color copy tool/option
  - [ ] add path-simplification-tool [live example demo](http://paperjs.org/examples/path-simplification/)

Used Libraries
==
 - [paperjs](http://paperjs.org/)
 - [memononen's stylii as base](https://github.com/memononen/stylii)
 - [material lite design](http://www.getmdl.io/)
 - [npm/nodejs](https://nodejs.org/en/)
 - [spectrum colorchooser](https://bgrins.github.io/spectrum/)
  
How to start developing on your own
==
  1. download the zip and extract OR git clone this project
  2. go to the root folder and use command "npm install" in order to load the missing node modules
  3. load/start the index.html via browser
