// Thanks to: https://odino.org/emit-a-beeping-sound-with-javascript/
let ac;
let v, u;

function beeper(vol, freq, duration){
	if (ac === undefined)
 {
	ac = new AudioContext() // browsers limit the number of concurrent audio contexts, so you better re-use'em
  v=ac.createOscillator()
  u=ac.createGain()
  v.connect(u)
  v.frequency.value=freq
  v.type="sawtooth"
  u.connect(ac.destination)
  u.gain.value=vol*0.01
 }
  v.start(ac.currentTime)
  v.stop(ac.currentTime+duration)
}

export {beeper}
