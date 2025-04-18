import {getFileHandle, getNewFileHandle, readFile, verifyPermission, writeFile} from "./fs-helpers.js";
import {beeper} from "./Beeper.js";
	
let beepsEnabled = false;

function beep()
{
	if (beepsEnabled) {
		beeper(0.5, 220, 0.1)
	}
}


class InActorState {
  constructor (updateText, statusObj) {
    this.playA = []
    this.recordA = []
    this.playerIndex = -1
    this.defaultDuration = 2.0
    this.fastForwardDuration = 15
    this.realTimePlayback = false
    this.updateText = updateText;
    if (statusObj) {this.statusObj = statusObj} else {this.statusObj = {}}

    this.blastOffTime = Date.now()
    
    this.boundTimerHandler = this.timerHandler.bind(this)
    this.updateCountDownClock = this.updateCountDownClock.bind(this)
}


pushSketch(code)
{
  	let snapshot = {
  		timeStamp: Date.now(),
  		sketch:    code
  	}
  	this.recordA.push(snapshot)
  	this.statusObj.hasrecord = true;
  	beep()
}


doClear(e)
{
	this.recordA = [];
	this.statusObj.hasrecord = false;
}


doFileImport()
{
	this.openFile();
}


doFileExport(e)
{
	this.saveFile(e)
}


doLoad(e)
{
	let asText = this.recordingToText();
	this.loadPlayer(asText);

}
	  
	    
doFastBackward(e)
{
	this.moveFast(e, -1)
}


doStepBackward(e)
{
	this.moveUp(e)
}


clearTimer()
{
	if (this.activeTimer)
	{
		clearTimeout(this.activeTimer)
		this.activeTimer = null
	}
}


startTimer(dur)
{
	this.clearTimer()
	let durMS =  dur * 1000
	this.blastOffTime = Date.now() + durMS
	this.activeTimer = setTimeout(this.boundTimerHandler, durMS)
}


timerHandler(e)
{
	this.activeTimer = null
	if(this.realTimePlayback)
	{
		this.moveDown(e, "play");
	}
}


updateCountDownClock()
{
	let nowTime = Date.now()
	let tMinus = nowTime - this.blastOffTime;
	if (tMinus > 0) tMinus = 0;
	let tPlus = Math.abs(tMinus);
	let timeAsString = "";
	let secs = Math.round(tPlus / 1000).toString();
	let tenths =  (Math.round(tPlus / 100) % 10).toString();
	let sign = tMinus < 0 ? '-' : ' ';
	timeAsString = sign + secs + "." + tenths;
	this.statusObj.countdown = timeAsString;
}


startCountdownClock()
{
	if (this.countDownIntervalObject === undefined)
	{
		this.countDownIntervalObject = setInterval(this.updateCountDownClock, 100)
	}
}


doPlay(e)
{
	this.realTimePlayback = !this.realTimePlayback

	if (this.realTimePlayback)
	{
		this.statusObj.playing = true;
		this.moveDown(e, "play")
		this.startCountdownClock()
		this.statusObj.playing = true;
	} else {
		this.clearTimer();
		this.statusObj.playing = false;
	}
}


doStepForward(e)
{
	this.moveDown(e, "step");
}


doFastForward(e)
{
	this.moveFast(e, 1)
}


doMark(e)
{
	this.mark()
}


// Saves a recording to disk.
async saveFile(e)
{
  let fileHandle;
  try {
    fileHandle = await getNewFileHandle();
  } catch (ex) {
    if (ex.name === 'AbortError') {
      return;
    }
    const msg = 'An error occured trying to open the file.';
    console.error(msg, ex);
    alert(msg);
    return;
  }
    try {
    	let text = this.recordingToText()
    	await writeFile(fileHandle, text);
    	// recordingA = [];

  } catch (ex) {
    const msg = 'Unable to save file.';
    console.error(msg, ex);
    alert(msg);
    return;
  }
}

  async openFile(e)
  {
  	let fhand = await getFileHandle();
		const file = await fhand.getFile();
		let text = await readFile(file);
	
		this.loadPlayer(text);
		
		this.statusObj.filename = file.name;
  }


	recordingToText()
	{
		let stringBuff = [];
	
		let rSize = this.recordA.length
		for (let i = 0; i < rSize; ++i)
		{
			let ent = this.recordA[i];
			let dT = 0
			if (ent.timeStamp) {
				if (i < rSize - 1)
				{
					dT = this.recordA[i + 1].timeStamp - ent.timeStamp;
					if (dT < 0)
					{
						dT = 0
					}
				}
				dT = dT / 1000
			} else {
				if (ent.dur)
				{
					dT = dur;
				} else {
					dT = 1.0
				}
			}

   		stringBuff.push("//+ " + dT);

 			if (ent.key)
 			{
				stringBuff += " key"
 			}

 			if (ent.mark)
 			{
				stringBuff += " mark"
 			}

			stringBuff.push( " " + i + " " + new Date(ent.timeStamp).toISOString() + "\n");
			stringBuff.push(ent.sketch)
			stringBuff.push("\n\n\n\n")
		}
		return stringBuff.join("")
	}


	 loadPlayer(text) {

		this.playA = [];
		this.playerIndex = 0;
		let textA = text.split(/\r\n|\n/)
		let aSize = textA.length
		if (aSize > 0 && textA[0].startsWith('{"code":'))
		{
			return this.loadJSONBase64(textA)
		}
		let ix = 0
		let working = []
		let runL = 0;
		let lastDur = 0; let marked = false; let keyFlag = false;
		for (ix = 0; ix < aSize; ++ix) {
			let ln = textA[ix]
			if (ln.trim() === '' || ln.startsWith ("----")) {
				runL++
			} else
			if (ln.startsWith("//+"))
			{
				// We have a frame boundary indicator, strip out the comment prefix and evaluate
				// to pickup mark & duration.
				let restOfLine = ln.substring(3).trim();
				// Get rid of old-format dur=
				if (restOfLine.startsWith('dur=')) {
					restOfLine = restOfLine.substring(4).trim();
				}
				let tokens = restOfLine.split(' ');

				let dur;
				keyFlag = false;
				marked = false;
				if (tokens.length > 0) {
					 dur = Number.parseFloat(tokens[0]);
					 if (isNaN(dur)) dur = 1.0;
				}
				for (let i = 1; i < tokens.length; ++i) {
					let s = tokens[i];
					if (s === "key") keyFlag = true;
					else if (s === "mark") marked = true;
				}
				if (dur !== undefined && dur >= 0)
				{
					lastDur = dur;
				}
			} else
			{
				if (runL >= 3) {
					// we have a split
					if (working.length > 0) {
						let sketch = working.join("\n")
						this.playA.push({dur: lastDur, mark: marked, key: keyFlag, sketch: sketch})
						working = []
						}
				}
				// no split yet, reset count.
				runL = 0;
				working.push(ln)
				lastDur = 0
				marked = false
			}
		}
		// Deal with last entry if we must.
		if (working.length > 0) {
			let lastSketch = working.join("\n")
			this.playA.push({dur: lastDur, mark: marked, key: keyFlag, sketch: lastSketch})
		}
		this.statusObj.hasplay = this.playA.length > 0;
		// console.log(this.playA)
	}


	// Load a file in the JSON, base64 encoded scheme Olivia sent me for the archive.
	loadJSONBase64(textA)
	{
		for (let ix = 0; ix < textA.length; ++ix) {
			let aLine
			try {
				 aLine = JSON.parse(textA[ix]);
			} catch (err) {
				console.log("Parse error in loadJSONBase64: " + err);
			}
			if (aLine !== undefined && aLine.code !== undefined)
			{
				try {
					let aSketch = decodeURIComponent(atob(aLine.code))
					if (aSketch.indexOf("initScreen") < 0) {
						this.playA.push({sketch: aSketch, dur: 2})
					} else {
						console.log("Skipped sketch with initScreen at line " + ix);
					}
				} catch (exs) {
				  console.log("Error decoding URI Component in loadJSONBase64: " + exs);
				}
			}
		}
		this.playerIndex = 0
		this.statusObj.hasplay = this.playA.length > 0;
	}


	loadAtIndex(e, what)
	{
		if (this.playA.length === 0) return;
		console.log("Load at X: " + this.playerIndex);
		let entry = this.playA[this.playerIndex];
		if (!entry) return;

		let sketchInfo = {};
		sketchInfo.key = entry.key === true;
		sketchInfo.mark = entry.mark === true;
		sketchInfo.dur = entry.dur;
		this.updateText(entry.sketch, sketchInfo, e, what);
		if (this.realTimePlayback)
		{
			this.clearTimer()
			let dur = entry.dur
			if (dur <= 0){dur = this.defaultDuration}
			this.startTimer(dur)
		}
		let xStr = this.playerIndex.toString();
		this.statusObj.playerIndex = xStr;
	}


  moveUp(e)
  {
		if (this.playA.length === 0) return;
  	this.playerIndex--;
  	if (this.playerIndex < 0) {
			this.playerIndex = this.playA.length - 1
		}
  	this.loadAtIndex(e, "step");
  }


  moveDown(e, what)
  {
		if (this.playA.length === 0) return;
		this.playerIndex++;
		if (this.playerIndex >= this.playA.length) this.playerIndex = 0
		this.loadAtIndex(e, what);
  }


	moveFast(e, dir)
	{
		if(this.playA.length === 0) return
		let loopMax = this.playA.length
		let playerXWas = this.playerIndex;
		while (loopMax > 0) {
			this.playerIndex += dir
			if (this.playerIndex < 0)
			{
				this.playerIndex = this.playA.length - 1
			}
			if (this.playerIndex >= this.playA.length)
			{
				this.playerIndex = 0
			}
			let ent = this.playA[this.playerIndex]
			if ((ent.mark !== undefined && ent.mark )
					|| (ent.dur !== undefined && ent.dur >= this.fastForwardDuration))
			{
				this.loadAtIndex(e, "fast");
				return
			}
			loopMax--;
		}
		// No mark or long-enough. Instead do a classic fastforw or fastrev.
		// (soon).
		this.playerIndex = playerXWas;
		let jump = 16
		if (this.playA.length <= jump)
		{
			jump = 4;
		}
		// Stop at 0 if jumping backward
		if (dir < 0 && playerXWas > 0 && jump > playerXWas) this.playerIndex = 0;
		else 
			this.playerIndex += jump * dir;
		
		if (this.playerIndex < 0)
		{
			this.playerIndex = this.playA.length - 1
		} else if (this.playerIndex >= this.playA.length)
		{
			this.playerIndex = 0
		}
		this.loadAtIndex(e, "fast");
	}


	mark(e) {
		if (this.recordA.length === 0) return;
		this.recordA[this.recordA.length - 1].mark = true;
		// Hack until a better UI gets made:
	}

}
export {InActorState}