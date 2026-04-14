import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input, FormField, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Project } from '../../types';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (data: { name: string; description?: string }) => Promise<void>;
  project?: Project | null;
}

export default function ProjectModal({ open, onClose, onSaved, project }: ProjectModalProps) {
  const isEdit = !!project;
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '');
      setDescription(project?.description ?? '');
      setErrors({});
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErrors({ name: 'Name is required' }); return; }
    setLoading(true);
    try {
      await onSaved({ name: name.trim(), description: description.trim() || undefined });
    } catch (err: unknown) {
      const e = err as Error & { fields?: Record<string, string> };
      if (e.fields) setErrors(e.fields);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit project' : 'New project'} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="proj-name">
          <Input id="proj-name" placeholder="My awesome project" value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}); }}
            error={errors.name} autoFocus />
        </FormField>
        <FormField label="Description (optional)" htmlFor="proj-desc">
          <Textarea id="proj-desc" placeholder="What's this project about?" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={3} />
        </FormField>
        <div className="flex gap-2.5 justify-end pt-2 border-t border-border/70 mt-1">
          <Button size="sm" type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>{isEdit ? 'Save changes' : 'Create project'}</Button>
        </div>
      </form>
    </Modal>
  );
}
