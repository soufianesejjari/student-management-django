'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { useSubjects } from '@/hooks/useSubjects';

export function SubjectDialog({ subject, onSave }: { subject?: any; onSave: (data: any) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: subject?.name || '',
    color_code: subject?.color_code || '#3788d8',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSave(formData);
      setOpen(false);
      setFormData({ name: '', color_code: '#3788d8' });
    } catch (error) {
      console.error('Error saving subject:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={subject ? 'ghost' : 'default'} size={subject ? 'sm' : 'default'}>
          {subject ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
          {!subject && 'Ajouter Sujet'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? 'Modifier le sujet' : 'Ajouter un nouveau sujet'}</DialogTitle>
          <DialogDescription>
            {subject ? 'Modifiez les informations du sujet' : 'Créez un nouveau sujet musical'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du sujet</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Piano, Guitare, Violon"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Couleur</Label>
            <div className="flex gap-2">
              <input
                id="color"
                type="color"
                value={formData.color_code}
                onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                className="h-10 w-20 cursor-pointer rounded border"
              />
              <Input
                value={formData.color_code}
                onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Enregistrement...' : subject ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubjectsManagement() {
  const { subjects, loading, createSubject, updateSubject, deleteSubject } = useSubjects();
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleCreateSubject = async (data: any) => {
    await createSubject(data.name, data.color_code);
  };

  const handleUpdateSubject = (subject: any) => {
    return async (data: any) => {
      await updateSubject(subject.id, data.name, data.color_code);
    };
  };

  const handleDeleteSubject = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce sujet?')) {
      try {
        setDeleting(id);
        await deleteSubject(id);
      } finally {
        setDeleting(null);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des sujets...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Sujets musicaux</CardTitle>
          <CardDescription>Gérez les sujets (instruments) disponibles à votre académie</CardDescription>
        </div>
        <SubjectDialog onSave={handleCreateSubject} />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full border"
                  style={{ backgroundColor: subject.color_code }}
                />
                <span className="font-medium">{subject.name}</span>
              </div>
              <div className="flex gap-2">
                <SubjectDialog subject={subject} onSave={handleUpdateSubject(subject)} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSubject(subject.id)}
                  disabled={deleting === subject.id}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {subjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun sujet créé. Cliquez sur "Ajouter Sujet" pour en créer un.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
