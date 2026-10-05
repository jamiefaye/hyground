import { getFileHandle, getNewFileHandle, readFile, verifyPermission, writeFile } from './fs-helpers.js';
import { beeper } from './Beeper.js';
import { lastParmTouch } from './Parm.js';

const beepsEnabled = false;

function beep ()
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
    this.maxDuration = 0;
    this.fastForwardDuration = 15
    this.realTimePlayback = false
    this.updateText = updateText;

    if (statusObj) {this.statusObj = statusObj} else {this.statusObj = {}}

    this.blastOffTime = Date.now()

    this.boundTimerHandler = this.timerHandler.bind(this)
    this.updateCountDownClock = this.updateCountDownClock.bind(this)
  }


  pushSketch (code)
  {
    const snapshot = {
      timeStamp: Date.now(),
      sketch:    code,
    }
    let hydra;
    this.recordA.push(snapshot)
    this.statusObj.hasrecord = true;
    beep()
  }

  evalDone (hydraRenderer, text, timeB4) {
    const outA = []
    // activeFromBefore is a custom hyv feature for recording - optional
    if (hydraRenderer.activeFromBefore) {
      const preamble = hydraRenderer.activeFromBefore(timeB4 + performance.timeOrigin);
      if (preamble !== '') {
        outA.push('/*\n');
        outA.push(preamble);
        outA.push('*/\n');
      }
    }
    outA.push(text);
    const code = outA.join('');
    this.pushSketch(code);
  }

  doClear (e)
  {
    this.recordA = [];
    this.statusObj.hasrecord = false;
  }


  doFileImport (e)
  {
    this.openFile(e);
  }


  doFileExport (e)
  {
    this.saveFile(e)
  }


  doLoad (e)
  {
    const asText = this.recordingToText();
    this.loadPlayer(asText);

  }


  doFastBackward (e)
  {
    this.moveFast(e, -1)
  }


  doStepBackward (e)
  {
    this.moveUp(e)
  }


  clearTimer ()
  {
    if (this.activeTimer)
    {
      clearTimeout(this.activeTimer)
      this.activeTimer = null
    }
  }


  startTimer (dur)
  {
    this.clearTimer()
    const durMS = dur * 1000
    this.blastOffTime = Date.now() + durMS
    this.activeTimer = setTimeout(this.boundTimerHandler, durMS)
  }


  // Seconds this sketch has yet to stay because someone is adjusting it: statusObj.holdDur after
  // the last touch of a parm control (0 = the option is off). A touch from before the sketch came
  // up does not count.
  holdRemaining ()
  {
    const hold = Number(this.statusObj.holdDur) || 0
    const touched = lastParmTouch()
    if (hold <= 0 || touched < (this.shownAt || 0)) return 0
    return Math.max(0, (touched + hold * 1000 - Date.now()) / 1000)
  }


  timerHandler (e)
  {
    this.activeTimer = null
    if(this.realTimePlayback)
    {
      // Someone is on the knobs: stay, and look again when their hold runs out
      const wait = this.holdRemaining()
      if (wait > 0)
      {
        this.holding = true
        this.startTimer(wait)
        return
      }
      this.moveDown(e, 'play');
    }
  }


  updateCountDownClock ()
  {
    const nowTime = Date.now()
    let tMinus
    if (this.realTimePlayback)
    {
      // a hold in force shows in the countdown before the timer comes round to it
      const heldUntil = nowTime + this.holdRemaining() * 1000
      this.statusObj.holding = this.holding === true || heldUntil > this.blastOffTime
      tMinus = nowTime - Math.max(this.blastOffTime, heldUntil);
    } else {
      // paused: the time the sketch has left, standing still (0.0 with no sketch of the player's up)
      this.statusObj.holding = false
      tMinus = -(this.pausedLeft || 0)
    }
    if (tMinus > 0) tMinus = 0;
    const tPlus = Math.abs(tMinus);
    let timeAsString = '';
    const secs = Math.trunc(tPlus / 1000).toString();
    const tenths = (Math.trunc(tPlus / 100) % 10).toString();
    const sign = tMinus < 0 ? '-' : ' ';
    timeAsString = sign + secs + '.' + tenths;
    this.statusObj.countdown = timeAsString;
    //console.log(timeAsString);
  }


  startCountdownClock ()
  {
    if (this.countDownIntervalObject === undefined)
    {
      this.countDownIntervalObject = setInterval(this.updateCountDownClock, 100)
    }
  }


  doPlay (e)
  {
    this.realTimePlayback = !this.realTimePlayback

    if (this.realTimePlayback)
    {
      this.statusObj.playing = true;
      // Released: the sketch that is up carries on with the time it had left (a step forward is
      // the way to move on at once). With none up yet, play starts by stepping.
      if (this.pausedLeft !== undefined)
      {
        this.startTimer(this.pausedLeft / 1000)
        this.pausedLeft = undefined
      } else {
        this.moveDown(e, 'play')
      }
      this.startCountdownClock()
      this.statusObj.playing = true;
    } else {
      // Paused: the sketch stays, and the clock stands at the time it had left
      this.clearTimer();
      this.statusObj.playing = false;
      this.pausedLeft = Math.max(0, this.blastOffTime - Date.now())
      this.holding = false
      this.updateCountDownClock()
    }
  }


  doStepForward (e)
  {
    this.moveDown(e, 'step');
  }


  doFastForward (e)
  {
    this.moveFast(e, 1)
  }


  doMark (e)
  {
    this.mark()
  }


  // Saves a recording to disk.
  // (e is the click: its window is where the file picker may open, the editors popup or this page)
  async saveFile (e)
  {
    let fileHandle;
    try {
      fileHandle = await getNewFileHandle((e && e.view) || window);
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
      const text = this.recordingToText()
      await writeFile(fileHandle, text);
      // recordingA = [];

    } catch (ex) {
      const msg = 'Unable to save file.';
      console.error(msg, ex);
      alert(msg);
      return;
    }
  }

  async openFile (e)
  {
    let fhand;
    try {
      fhand = await getFileHandle((e && e.view) || window);
    } catch (ex) {
      if (ex.name !== 'AbortError') console.error('InAct: could not open the file picker', ex);
      return;
    }
    const file = await fhand.getFile();
    const text = await readFile(file);

    this.loadPlayer(text);

    this.statusObj.filename = file.name;
  }


  recordingToText ()
  {
    let stringBuff = [];

    const rSize = this.recordA.length
    for (let i = 0; i < rSize; ++i)
    {
      const ent = this.recordA[i];
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
          dT = ent.dur;
        } else {
          dT = 1.0
        }
      }

      stringBuff.push('//+ ' + dT);

      if (ent.key)
      {
        stringBuff += ' key'
      }

      if (ent.mark)
      {
        stringBuff += ' mark'
      }

      if (ent.timeStamp) {
        stringBuff.push( ' ' + i + ' ' + new Date(ent.timeStamp).toISOString() + '\n');
      }
      else {
        stringBuff.push(' ' + i + '\n');
      }
      stringBuff.push(ent.sketch)
      stringBuff.push('\n\n\n\n')
    }
    return stringBuff.join('')
  }


  loadPlayer (text) {

    this.playA = [];
    // None of the new file's sketches is up yet: the first play or step forward shows the first one
    // (the index stood at 0, so they went to the second and the first waited for the loop to come round)
    this.playerIndex = -1;
    this.pausedLeft = undefined;
    const textA = text.split(/\r\n|\n/)
    const aSize = textA.length
    if (aSize > 0 && textA[0].startsWith('{"code":'))
    {
      return this.loadJSONBase64(textA)
    }
    let ix = 0
    let working = []
    let runL = 0;
    // A //+ line belongs to the sketch below it. head: what the last //+ line said, waiting for
    // that sketch's first line; info: the same for the sketch being gathered.
    // (Both used to be one set of variables, so a sketch was pushed with the next one's line:
    // every duration and mark sat one sketch early and the last sketch had none.)
    const noHead = () => ({ dur: 0, mark: false, key: false });
    let head = noHead(); let info = noHead();
    for (ix = 0; ix < aSize; ++ix) {
      const ln = textA[ix]
      if (ln.trim() === '' || ln.startsWith ('----')) {
        runL++
      } else
        if (ln.startsWith('//+'))
        {
          // We have a frame boundary indicator, strip out the comment prefix and evaluate
          // to pickup mark & duration.
          let restOfLine = ln.substring(3).trim();
          // Get rid of old-format dur=
          if (restOfLine.startsWith('dur=')) {
            restOfLine = restOfLine.substring(4).trim();
          }
          const tokens = restOfLine.split(' ');

          let dur;
          head = noHead();
          if (tokens.length > 0) {
            dur = Number.parseFloat(tokens[0]);
            if (isNaN(dur)) dur = 1.0;
          }
          for (let i = 1; i < tokens.length; ++i) {
            const s = tokens[i];
            if (s === 'key') head.key = true;
            else if (s === 'mark') head.mark = true;
          }
          if (dur !== undefined && dur >= 0)
          {
            head.dur = dur;
          }
        } else
        {
          if (runL >= 3) {
            // we have a split
            if (working.length > 0) {
              const sketch = working.join('\n')
              this.playA.push({ dur: info.dur, mark: info.mark, key: info.key, sketch })
              working = []
            }
          }
          // a sketch's first line: the //+ line above it is its own
          if (working.length === 0) { info = head; head = noHead(); }
          // no split yet, reset count.
          runL = 0;
          working.push(ln)
        }
    }
    // Deal with last entry if we must.
    if (working.length > 0) {
      const lastSketch = working.join('\n')
      this.playA.push({ dur: info.dur, mark: info.mark, key: info.key, sketch: lastSketch })
    }
    this.statusObj.hasplay = this.playA.length > 0;

    // console.log(this.playA)
  }


  // Load a file in the JSON, base64 encoded scheme Olivia sent me for the archive.
  loadJSONBase64 (textA)
  {
    for (let ix = 0; ix < textA.length; ++ix) {
      let aLine
      try {
        aLine = JSON.parse(textA[ix]);
      } catch (err) {
        console.log('Parse error in loadJSONBase64: ' + err);
      }
      if (aLine !== undefined && aLine.code !== undefined)
      {
        try {
          const aSketch = decodeURIComponent(atob(aLine.code))
          if (aSketch.indexOf('initScreen') < 0) {
            this.playA.push({ sketch: aSketch, dur: 2 })
          } else {
            console.log('Skipped sketch with initScreen at line ' + ix);
          }
        } catch (exs) {
          console.log('Error decoding URI Component in loadJSONBase64: ' + exs);
        }
      }
    }
    this.playerIndex = -1
    this.statusObj.hasplay = this.playA.length > 0;
    //	this.recordA = this.playA; // Used to export compressed hydra to uncompressed hydra.

  }


  loadAtIndex (e, what)
  {
    if (this.playA.length === 0) return;
    console.log('Load at X: ' + this.playerIndex);
    const entry = this.playA[this.playerIndex];
    if (!entry) return;

    const sketchInfo = {};
    sketchInfo.key = entry.key === true;
    sketchInfo.mark = entry.mark === true;
    sketchInfo.dur = entry.dur;
    this.updateText(entry.sketch, sketchInfo, e, what);
    this.shownAt = Date.now()
    this.holding = false
    let dur = entry.dur
    if (!(dur > 0)){dur = this.statusObj.defaultDur}
    if (this.statusObj.maxDur && dur > this.statusObj.maxDur) dur = this.statusObj.maxDur;
    if (this.realTimePlayback)
    {
      this.clearTimer()
      this.startTimer(dur)
    } else {
      // stepped to while paused: its whole time waits for play
      this.pausedLeft = (Number(dur) || 0) * 1000
    }
    const xStr = this.playerIndex.toString();
    this.statusObj.playerIndex = xStr;
    this.updateCountDownClock()
  }


  moveUp (e)
  {
    if (this.playA.length === 0) return;
    this.playerIndex--;
    if (this.playerIndex < 0) {
      this.playerIndex = this.playA.length - 1
    }
    this.loadAtIndex(e, 'step');
  }


  moveDown (e, what)
  {
    if (this.playA.length === 0) return;
    this.playerIndex++;
    if (this.playerIndex >= this.playA.length) this.playerIndex = 0
    this.loadAtIndex(e, what);
  }


  moveFast (e, dir)
  {
    if(this.playA.length === 0) return
    let loopMax = this.playA.length
    const playerXWas = this.playerIndex;
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
      const ent = this.playA[this.playerIndex]
      if ((ent.mark !== undefined && ent.mark )
					|| (ent.dur !== undefined && ent.dur >= this.fastForwardDuration))
      {
        this.loadAtIndex(e, 'fast');
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
    this.loadAtIndex(e, 'fast');
  }


  mark (e) {
    if (this.recordA.length === 0) return;
    this.recordA[this.recordA.length - 1].mark = true;
    // Hack until a better UI gets made:
  }


  openSettings (e) {
    this.maxDuration = 1;
  }

} // end of InActorState class.


export { InActorState }
