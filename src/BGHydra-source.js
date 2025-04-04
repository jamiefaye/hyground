//import Webcam from './lib/webcam.js'
//import Screen from './lib/screenmedia.js'

class BGHydraSource {

  constructor ({ regl, width, height, pb, sourceX, label = ""}) {
    this.label = label
    this.regl = regl
    this.src = null
    this.dynamic = true
    this.width = width
    this.height = height
    this.tex = this.regl.texture({
      //  shape: [width, height]
      shape: [ 1, 1 ]
    })
    this.pb = pb
    this.sourceX = sourceX
    console.log ("Source with worker created");
  }

  init (opts, params) {
    if ('src' in opts) {
      this.src = opts.src
      this.tex = this.regl.texture({ data: this.src, ...params })
    }
    if ('dynamic' in opts) this.dynamic = opts.dynamic
  }

	activate(width, height) {
		this.offscreencanvas= new OffscreenCanvas(width, height); 
		this.bmr = this.offscreencanvas.getContext("bitmaprenderer");
		this.init({src: this.offscreencanvas, dynamic: true});
		console.log("activate complete");
	}


  initCam (index, params) {
  	this.worker.openSourceProxy("webcam", this.sourceX, index, params);
  }


  initVideo (url = '', params) {
  	this.worker.openSourceProxy("video", this.sourceX, url, params);
  }

  initImage (url = '', params) {
   	this.worker.openSourceProxy("image", this.sourceX, url, params); 	
  }

  initStream (streamName, params) {
    //  console.log("initing stream!", streamName)
    let self = this
    if (streamName && this.pb) {
      this.pb.initSource(streamName)

      this.pb.on('got video', function (nick, video) {
        if (nick === streamName) {
          self.src = video
          self.dynamic = true
          self.tex = self.regl.texture({ data: self.src, ...params})
        }
      })
    }
  }

  // index only relevant in atom-hydra + desktop apps
  initScreen (index = 0, params) {
   	this.worker.openSourceProxy("screen", index, 0, params);
/*
    const self = this
    Screen()
      .then(function (response) {
        self.src = response.video
        self.tex = self.regl.texture({ data: self.src, ...params})
        self.dynamic = true
        //  console.log("received screen input")
      })
      .catch(err => console.log('could not get screen', err))
  */
  }

  resize (width, height) {
    this.width = width
    this.height = height
  }

  clear () {
    if (this.src && this.src.srcObject) {
      if (this.src.srcObject.getTracks) {
        this.src.srcObject.getTracks().forEach(track => track.stop())
      }
    }
    
    this.offscreencanvas = undefined;
		this.bmr = undefined;

    this.src = null
    this.tex = this.regl.texture({ shape: [ 1, 1 ] })
  }

  tick (time) {
    //  console.log(this.src, this.tex.width, this.tex.height)
    if (this.src !== null && this.dynamic === true) {
      if (this.src.videoWidth && this.src.videoWidth !== this.tex.width) {
        console.log(
          this.src.videoWidth,
          this.src.videoHeight,
          this.tex.width,
          this.tex.height
        )
        this.tex.resize(this.src.videoWidth, this.src.videoHeight)
      }

      if (this.src.width && this.src.width !== this.tex.width) {
        this.tex.resize(this.src.width, this.src.height)
      }

      this.tex.subimage(this.src)
    }
  }


  getTexture () {
    return this.tex
  }


	injectImage(img) {

		if (!this.offscreencanvas) {
			this.activate(img.width, img.height);
		}
		this.bmr.transferFromImageBitmap(img);
	}

}

export {BGHydraSource};