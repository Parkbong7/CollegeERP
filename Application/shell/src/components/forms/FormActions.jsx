import React from 'react';
import Button from '../common/Button';

export default function FormActions({
  onCancel,
  submitText = 'Save Changes',
  cancelText = 'Cancel',
  loading = false,
  submitDisabled = false,
  className = ''
}) {
  return (
    <div className={`flex items-center justify-end space-x-3 pt-4 border-t border-[#EBD9CB] ${className}`}>
      {onCancel && (
        <Button variant="secondary" size="md" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
      )}
      <Button variant="primary" size="md" type="submit" loading={loading} disabled={submitDisabled}>
        {submitText}
      </Button>
    </div>
  );
}
