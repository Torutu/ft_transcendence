// frontend/src/components/shared/AvatarSelector.tsx
import React from 'react';
import { AvatarData } from '../../shared/types';

interface AvatarSelectorProps {
  avatar: AvatarData | null;
  onChooseAvatar: () => void;
  borderColor: string;
  buttonColor: string;
  buttonHoverColor: string;
  placeholder?: string;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  avatar,
  onChooseAvatar,
  borderColor,
  buttonColor,
  buttonHoverColor,
  placeholder = "No avatar selected"
}) => {
  return (
    <>
      {avatar ? (
        <>
          <img
            src={avatar.image}
            alt={avatar.name}
            className={`w-32 h-32 rounded-full border-4 ${borderColor} mb-2 object-cover`}
          />
          <p className="capitalize mb-4">{avatar.name}</p>
        </>
      ) : (
        <div className="text-center mb-4">
          <div className={`w-32 h-32 bg-gray-600 border-4 border-dashed border-gray-500 rounded-full flex items-center justify-center text-gray-400 text-4xl mb-2`}>
            ?
          </div>
          <p className="italic text-gray-400">{placeholder}</p>
        </div>
      )}

      <button
        onClick={onChooseAvatar}
        className={`${buttonColor} hover:${buttonHoverColor} px-4 py-2 rounded-lg font-semibold`}
      >
        {avatar ? "Change Avatar" : "Choose Avatar"}
      </button>
    </>
  );
};