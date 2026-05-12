import { useEffect, useState } from 'react';

export function useActionMenu() {
  const [openActionMenu, setOpenActionMenu] = useState(null);

  function closeMenu() {
    setOpenActionMenu(null);
  }

  function closeAllMenus() {
    setOpenActionMenu(null);
  }

  function toggleRowMenu(event, row, type) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();

    setOpenActionMenu((currentMenu) =>
      currentMenu?.type === type && currentMenu?.row?.id === row.id
        ? null
        : {
            type,
            row,
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
          }
    );
  }

  function runWithClosedMenu(callback) {
    callback();
    closeMenu();
  }

  function getMenu(type) {
    return openActionMenu?.type === type ? openActionMenu : null;
  }

  useEffect(() => {
    if (!openActionMenu) return undefined;

    const handleClickOutside = () => closeAllMenus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeAllMenus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openActionMenu]);

  return {
    closeAllMenus,
    closeMenu,
    getMenu,
    openActionMenu,
    runWithClosedMenu,
    toggleRowMenu,
  };
}
