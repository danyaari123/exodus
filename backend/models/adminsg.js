const adminMsgSchema = new mongoose.Schema({
  from: String,            // user's username
  text: String,            // question/message
  createdAt: { type: Date, default: Date.now },
  reply: { type: String, default: '' }, // admin answer
  repliedAt: Date
});
const AdminMsg = mongoose.model('AdminMsg', adminMsgSchema);
