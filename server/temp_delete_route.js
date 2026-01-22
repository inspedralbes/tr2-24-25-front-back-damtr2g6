
app.delete('/api/students/:ralc', async (req, res) => {
    try {
        const { ralc } = req.params;
        const userId = parseInt(req.query.userId);

        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'Expedient no trobat' });

        const requestUser = await User.findByPk(userId);
        if (!requestUser) return res.status(404).json({ error: 'Usuari sol·licitant no existeix' });

        const isOwner = String(student.ownerId) === String(userId);
        // Admin del mismo centro puede borrar
        const isAdmin = requestUser.role === 'admin' && String(requestUser.center_code) === String(student.centerCode);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'No tens permisos per eliminar aquest expedient (Només propietari o admin del centre).' });
        }

        await Student.findByIdAndDelete(ralc);

        console.log(`🗑️ Expedient ${ralc} eliminat per usuari ${userId}`);
        res.json({ message: 'Expedient eliminat correctament.' });

    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ error: 'Error del servidor al eliminar expedient.' });
    }
});
