import { Router } from "express";
import Setor from "../models/Setor";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/", auth, async (_, res) => {
  const setores = await Setor.find();
  res.json(setores);
});

router.post("/", auth, async (req, res) => {
  const setor = await Setor.create(req.body);
  res.json(setor);
});

router.put("/:id", auth, async (req, res) => {
  const setor = await Setor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(setor);
});

router.delete("/:id", auth, async (req, res) => {
  await Setor.findByIdAndDelete(req.params.id);
  res.json({ msg: "Setor removido" });
});

export default router;
