import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Building2, MapPin, Phone, UserRound } from 'lucide-react';

import AdminGuard from '@/components/admin/AdminGuard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@macom/ui';
import { dataClient } from '@/api/dataClient';

export default function ManageUnits() {
  const { user } = useOutletContext();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['all-units'],
    queryFn: () => dataClient.entities.Unit.list('-name'),
  });

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest" style={{ color: '#E30613' }}>
            Administracao
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Unidades</h1>
          <p className="mt-1 text-xs" style={{ color: '#666' }}>
            Consulta das unidades oficiais cadastradas no Central.
          </p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="overflow-hidden bg-white" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Nome</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Cidade</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Responsavel</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Telefone</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm" style={{ color: '#999' }}>
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <Building2 className="mx-auto mb-2 h-10 w-10" style={{ color: '#ddd' }} />
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#bbb' }}>
                        Nenhuma unidade encontrada
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map((unit) => (
                    <TableRow key={unit.id} className="transition-colors hover:bg-gray-50">
                      <TableCell className="font-bold text-sm" style={{ color: '#141414' }}>
                        {unit.name}
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: '#666' }}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {unit.city || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: '#666' }}>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5" />
                          {unit.manager || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: '#666' }}>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          {unit.phone || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                          style={{
                            background: unit.active ? '#141414' : '#eee',
                            color: unit.active ? '#fff' : '#999',
                          }}
                        >
                          {unit.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
