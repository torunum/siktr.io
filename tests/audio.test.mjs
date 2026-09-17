import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/audio.js';

// WebAudio is not present in Node. This boundary fake records the actual gain
// selected by GameAudio.start; synthesis itself is exercised in the browser.
class AudioContextBoundary {
 currentTime=0;sampleRate=80;destination={};
 createGain(){return {gain:{value:1,setTargetAtTime(value){this.value=value;}},connect(){}};}
 createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData(){return data;}};}
 createBufferSource(){return {connect(){},start(){}};}
 createBiquadFilter(){return {frequency:{value:0},connect(){}};}
 createOscillator(){return {frequency:{value:0,setTargetAtTime(value){this.value=value;}},connect(){},start(){}};}
 resume(){}
}
test('muting before the first PLAY also mutes the newly created audio graph',()=>{
 const previous=globalThis.AudioContext;globalThis.AudioContext=AudioContextBoundary;
 try{const sound=new GameAudio();assert.equal(sound.toggle(),true);sound.start(0);assert.equal(sound.master.gain.value,0);assert.equal(sound.toggle(),false);assert.equal(sound.master.gain.value,.55);}finally{globalThis.AudioContext=previous;}
});
