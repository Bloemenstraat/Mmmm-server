import mongoose from "mongoose";
const dialogueSchema = new mongoose.Schema({
    //chat: [mongoose.Types.ObjectId],
    chat: [{ role: String, content: String, _id: false }]
}, { minimize: false });
const Dialogue = mongoose.model('Dialogue', dialogueSchema);
export default Dialogue;
//# sourceMappingURL=dialogue.js.map