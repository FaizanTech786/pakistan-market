const express=require('express');const fs=require('fs');const path=require('path');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');const multer=require('multer');const crypto=require('crypto');
const app=express();const PORT=process.env.PORT||3000;const JWT_SECRET=process.env.JWT_SECRET||'dev-secret-change-me-use-env';
const DB=path.join(__dirname,'data','db.json');if(!fs.existsSync(path.dirname(DB)))fs.mkdirSync(path.dirname(DB),{recursive:true});
if(!fs.existsSync(DB))fs.writeFileSync(DB,JSON.stringify({users:[],listings:[],categories:['Property','Cars','Bikes','Mobile Phones','Electronics','Furniture','Fashion','Animals','Other'],conversations:[],messages:[],deals:[]},null,2));
const read=()=>{const d=JSON.parse(fs.readFileSync(DB,'utf8'));d.users ||= [];d.listings ||= [];d.categories ||= ['Property','Cars','Bikes','Mobile Phones','Electronics','Furniture','Fashion','Animals','Other'];d.conversations ||= [];d.messages ||= [];d.deals ||= [];return d};const write=d=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
const appName=process.env.APP_NAME||'Pakistan Market';
function initAdmin(){let d=read();const email=(process.env.ADMIN_EMAIL||'pakistanmarket357@gmail.com').toLowerCase();if(!d.users.find(u=>u.email===email)){const pw=process.env.ADMIN_PASSWORD||'CHANGE_ME_NOW';d.users.push({id:crypto.randomUUID(),name:'Pakistan Market Admin',email,password:bcrypt.hashSync(pw,10),role:'admin',createdAt:new Date().toISOString()});write(d)}}initAdmin();
app.use(express.json({limit:'4mb'}));app.use(express.urlencoded({extended:true}));
for(const dir of ['uploads','uploads/chat']){const p=path.join(__dirname,dir);if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true})}
app.use('/uploads',express.static(path.join(__dirname,'uploads')));app.use(express.static(path.join(__dirname,'public')));
const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,path.join(__dirname,'uploads')),filename:(req,file,cb)=>cb(null,Date.now()+'-'+crypto.randomBytes(5).toString('hex')+path.extname(file.originalname).toLowerCase())});
const chatStorage=multer.diskStorage({destination:(req,file,cb)=>cb(null,path.join(__dirname,'uploads/chat')),filename:(req,file,cb)=>cb(null,Date.now()+'-'+crypto.randomBytes(5).toString('hex')+path.extname(file.originalname).toLowerCase())});
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'application/pdf'
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});
const chatUpload=multer({storage:chatStorage,limits:{fileSize:15*1024*1024},fileFilter:(req,f,cb)=>cb(null,/^(image\/(jpeg|png|webp|jpg|gif)|audio\/(webm|ogg|mpeg|wav|mp4)|application\/pdf|text\/plain)$/.test(f.mimetype))});
function auth(req,res,next){try{const t=(req.headers.authorization||'').replace('Bearer ','');req.user=jwt.verify(t,JWT_SECRET);next()}catch(e){res.status(401).json({error:'Authentication required'})}}
function admin(req,res,next){auth(req,res,()=>req.user.role==='admin'?next():res.status(403).json({error:'Admin only'}))}
function userName(d,id){return d.users.find(u=>u.id===id)?.name||'User'}
app.get('/api/config',(req,res)=>res.json({appName,disclaimer:{ur:'جانی نقصان، مالی نقصان، چوری یا فراڈ ہونے پر پاکستان مارکیٹ ذمہ دار نہیں ہو گی۔ اپنی چیز کا خیال رکھیں۔ پاکستان مارکیٹ میں لسٹ کرنے سے پہلے اس بات کو قبول کریں۔',en:'Pakistan Market is not responsible for personal injury, financial loss, theft or fraud. Please take care of your belongings. By listing on Pakistan Market, you acknowledge this notice.'}}));
app.post('/api/register',(req,res)=>{let{name,email,password}=req.body;email=(email||'').trim().toLowerCase();if(!name||!email||!password||password.length<6)return res.status(400).json({error:'Name, valid email and password (6+ characters) are required'});let d=read();if(d.users.some(u=>u.email===email))return res.status(409).json({error:'Email already registered'});let u={id:crypto.randomUUID(),name:name.trim(),email,password:bcrypt.hashSync(password,10),role:'user',createdAt:new Date().toISOString()};d.users.push(u);write(d);res.json({message:'Account created'})});
app.post('/api/login',(req,res)=>{let{email,password}=req.body;let d=read(),u=d.users.find(x=>x.email===(email||'').trim().toLowerCase());if(!u||!bcrypt.compareSync(password||'',u.password))return res.status(401).json({error:'Invalid email or password'});let token=jwt.sign({id:u.id,email:u.email,name:u.name,role:u.role},JWT_SECRET,{expiresIn:'7d'});res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}})});
app.get('/api/categories',(req,res)=>res.json(read().categories));
app.get('/api/listings',(req,res)=>{let d=read(),q=(req.query.q||'').toLowerCase(),cat=req.query.category||'',status='approved';let a=d.listings.filter(x=>(x.status===status)&&(!q||[x.title,x.description,x.city,x.category].join(' ').toLowerCase().includes(q))&&(!cat||x.category===cat)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));res.json(a.map(x=>({...x,ownerName:x.ownerType==='admin'?'Pakistan Market':userName(d,x.userId),ownerType:undefined,phone:undefined})))});
app.get('/api/my-listings',auth,(req,res)=>{let d=read();res.json(d.listings.filter(x=>x.userId===req.user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)))});
app.post('/api/listings',auth,upload.array('images',8),(req,res)=>{const{title,description,price,category,city,phone,ownerType}=req.body;if(!title||!description||!category||!city)return res.status(400).json({error:'Title, description, category and city are required'});if(ownerType==='admin'&&req.user.role!=='admin')return res.status(403).json({error:'Admin only'});let d=read();let l={id:crypto.randomUUID(),userId:req.user.id,ownerType:req.user.role==='admin'&&ownerType==='admin'?'admin':'user',title:title.trim(),description:description.trim(),price:price||'Negotiable',category,city,phone:phone||'',images:(req.files||[]).map(f=>'/uploads/'+f.filename),status:'pending',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.listings.push(l);write(d);res.json(l)});
app.patch('/api/listings/:id/status',admin,(req,res)=>{let d=read(),l=d.listings.find(x=>x.id===req.params.id);if(!l)return res.status(404).json({error:'Listing not found'});if(!['approved','rejected','pending'].includes(req.body.status))return res.status(400).json({error:'Invalid status'});l.status=req.body.status;l.updatedAt=new Date().toISOString();write(d);res.json(l)});
app.delete('/api/listings/:id',auth,(req,res)=>{let d=read(),l=d.listings.find(x=>x.id===req.params.id);if(!l)return res.status(404).json({error:'Not found'});if(req.user.role!=='admin'&&l.userId!==req.user.id)return res.status(403).json({error:'Forbidden'});d.listings=d.listings.filter(x=>x.id!==l.id);write(d);res.json({ok:true})});
app.get('/api/admin/stats',admin,(req,res)=>{let d=read();res.json({users:d.users.filter(u=>u.role==='user').length,listings:d.listings.length,pending:d.listings.filter(x=>x.status==='pending').length,approved:d.listings.filter(x=>x.status==='approved').length,rejected:d.listings.filter(x=>x.status==='rejected').length,conversations:d.conversations.length,deals:d.deals.length})});
app.get('/api/admin/users',admin,(req,res)=>res.json(read().users.map(({password,...u})=>u)));
app.get('/api/admin/listings',admin,(req,res)=>{let d=read();res.json(d.listings.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(x=>({...x,ownerName:x.ownerType==='admin'?'Pakistan Market':userName(d,x.userId)})))});
// Admin-mediated conversations: buyers and sellers never receive each other's contact details.
app.post('/api/conversations',auth,(req,res)=>{const{listingId}=req.body;let d=read(),l=d.listings.find(x=>x.id===listingId&&x.status==='approved');if(!l)return res.status(404).json({error:'Approved listing not found'});let c=d.conversations.find(x=>x.listingId===listingId&&x.buyerId===req.user.id&&x.status!=='closed');if(!c){c={id:crypto.randomUUID(),listingId,buyerId:req.user.id,sellerId:l.userId,status:'open',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.conversations.push(c);write(d)}res.json(c)});
function canAccessConversation(req,c){return req.user.role==='admin'||c.buyerId===req.user.id||c.sellerId===req.user.id}
app.get('/api/conversations',auth,(req,res)=>{let d=read(),cs=req.user.role==='admin'?d.conversations:d.conversations.filter(c=>c.buyerId===req.user.id||c.sellerId===req.user.id);res.json(cs.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).map(c=>({...c,listing:d.listings.find(l=>l.id===c.listingId),buyerName:userName(d,c.buyerId),sellerName:c.sellerId===c.buyerId?'Pakistan Market':userName(d,c.sellerId)})))});
app.get('/api/conversations/:id/messages',auth,(req,res)=>{let d=read(),c=d.conversations.find(x=>x.id===req.params.id);if(!c||!canAccessConversation(req,c))return res.status(403).json({error:'Forbidden'});let msgs=d.messages.filter(m=>m.conversationId===c.id);if(req.user.role!=='admin'){const audience=req.user.id===c.buyerId?'buyer':'seller';msgs=msgs.filter(m=>m.audience==='both'||m.audience===audience)}res.json(msgs.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)))});
app.post('/api/conversations/:id/messages',auth,chatUpload.single('attachment'),(req,res)=>{let d=read(),c=d.conversations.find(x=>x.id===req.params.id);if(!c||!canAccessConversation(req,c))return res.status(403).json({error:'Forbidden'});let text=(req.body.text||'').trim();if(!text&&!req.file)return res.status(400).json({error:'Message or attachment required'});let audience=req.user.role==='admin'?'both':(req.user.id===c.buyerId?'buyer':'seller');let m={id:crypto.randomUUID(),conversationId:c.id,senderId:req.user.id,senderRole:req.user.role,audience,text,attachment:req.file?{url:'/uploads/chat/'+req.file.filename,name:req.file.originalname,type:req.file.mimetype,size:req.file.size}:null,createdAt:new Date().toISOString()};d.messages.push(m);c.updatedAt=m.createdAt;write(d);res.json(m)});
app.patch('/api/conversations/:id/status',admin,(req,res)=>{let d=read(),c=d.conversations.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Conversation not found'});if(!['open','closed'].includes(req.body.status))return res.status(400).json({error:'Invalid status'});c.status=req.body.status;c.updatedAt=new Date().toISOString();write(d);res.json(c)});
app.post('/api/deals',admin,(req,res)=>{
  const {conversationId,amount,note}=req.body;
  let d=read();
  let c=d.conversations.find(x=>x.id===conversationId);

  if(!c) return res.status(404).json({error:'Conversation not found'});

  let l=d.listings.find(x=>x.id===c.listingId);

  if(!l) return res.status(404).json({error:'Listing not found'});

  let deal={
    id:crypto.randomUUID(),
    conversationId,
    listingId:l.id,
    buyerId:c.buyerId,
    sellerId:l.userId,
    amount:amount||l.price,
    status:'pending_payment',
    note:note||'',
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  d.deals.push(deal);
  write(d);
  res.json(deal);
});
app.get('/api/deals',auth,(req,res)=>{let d=read(),a=req.user.role==='admin'?d.deals:d.deals.filter(x=>x.buyerId===req.user.id||x.sellerId===req.user.id);res.json(a.sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt)))});
app.patch('/api/deals/:id/status',admin,(req,res)=>{let d=read(),deal=d.deals.find(x=>x.id===req.params.id);if(!deal)return res.status(404).json({error:'Deal not found'});if(!['pending_payment','payment_received','seller_confirmed','completed','cancelled'].includes(req.body.status))return res.status(400).json({error:'Invalid deal status'});deal.status=req.body.status;deal.updatedAt=new Date().toISOString();write(d);res.json(deal)});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));app.listen(PORT,()=>console.log(`${appName} running on http://localhost:${PORT}`));
