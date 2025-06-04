import { ref } from 'vue';

const editText = ref('');
const editPath = ref('/');
const editBlob = ref(null);

let openEditOn;
let waverly;

function setOpener (opener) {
  openEditOn = opener;
}

function setWave (wv) {
  waverly = wv;
}

export { editText, editPath, setOpener, openEditOn, editBlob, waverly, setWave };
