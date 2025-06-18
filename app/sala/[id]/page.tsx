'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '../../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface Prenotazione {
  id: string;
  sala: string;
  data_ora: string;
  data_ora_fine?: string;
  utente: string;
  fornitore: string;
  numero_persone: number;
}

export default function SalaPage() {
  const { id } = useParams();
  const router = useRouter();
  const salaId = decodeURIComponent(id as string);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newBooking, setNewBooking] = useState({
    utente: '',
    fornitore: '',
    numero_persone: 1,
    start: '',
    end: ''
  });
  const [editBooking, setEditBooking] = useState({
    utente: '',
    fornitore: '',
    numero_persone: 1,
    start: '',
    end: ''
  });

  useEffect(() => {
    const fetchPrenotazioni = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('sala', salaId)
        .order('data_ora', { ascending: true });

      if (fetchError) {
        setError('Errore nel caricamento delle prenotazioni');
        console.error('Fetch error:', fetchError);
      } else if (data) {
        const calendarEvents = data.map((p) => ({
          id: p.id,
          title: `${p.utente} - ${p.fornitore} (${p.numero_persone} pers.)`,
          start: p.data_ora,
          end: p.data_ora_fine || undefined,
          allDay: false,
          extendedProps: {
            utente: p.utente,
            fornitore: p.fornitore,
            sala: p.sala,
            numero_persone: p.numero_persone
          }
        }));
        setEvents(calendarEvents);
      }
      setLoading(false);
    };

    if (salaId) fetchPrenotazioni();

    const channel = supabase
      .channel('prenotazioni')
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public', 
          table: 'prenotazioni',
        }, 
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'DELETE') {
            setEvents(prevEvents => prevEvents.filter(event => event.id !== payload.old.id));
            return;
          }
          
          if (payload.new.sala === salaId) {
            if (payload.eventType === 'INSERT') {
              setEvents(prevEvents => [
                ...prevEvents,
                {
                  id: payload.new.id,
                  title: `${payload.new.utente} - ${payload.new.fornitore} (${payload.new.numero_persone} pers.)`,
                  start: payload.new.data_ora,
                  end: payload.new.data_ora_fine || undefined,
                  allDay: false,
                  extendedProps: {
                    utente: payload.new.utente,
                    fornitore: payload.new.fornitore,
                    sala: payload.new.sala,
                    numero_persone: payload.new.numero_persone
                  }
                }
              ]);
            } else if (payload.eventType === 'UPDATE') {
              setEvents(prevEvents =>
                prevEvents.map(event =>
                  event.id === payload.new.id
                    ? { 
                        ...event,
                        title: `${payload.new.utente} - ${payload.new.fornitore} (${payload.new.numero_persone} pers.)`,
                        start: payload.new.data_ora,
                        end: payload.new.data_ora_fine || undefined,
                        extendedProps: {
                          utente: payload.new.utente,
                          fornitore: payload.new.fornitore,
                          sala: payload.new.sala,
                          numero_persone: payload.new.numero_persone
                        }
                      }
                    : event
                )
              );
            }
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salaId]);

  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Converti la data in formato locale ma senza l'offset del fuso orario
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleDateSelect = (selectInfo: any) => {
    setNewBooking({
      utente: '',
      fornitore: '',
      numero_persone: 1,
      start: selectInfo.startStr,
      end: selectInfo.endStr
    });
    setShowCreateDialog(true);
  };

  const handleCreateBooking = async () => {
    if (!newBooking.utente || !newBooking.fornitore || !newBooking.numero_persone) return;

    setLoading(true);
    setError(null);

    // Converti le date in UTC mantenendo lo stesso orario visualizzato
    const startDate = new Date(newBooking.start);
    const endDate = new Date(newBooking.end);
    
    // Aggiungi l'offset del fuso orario per mantenere lo stesso orario
    const startUTC = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000).toISOString();
    const endUTC = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000).toISOString();

    const { error: insertError } = await supabase
      .from('prenotazioni')
      .insert([
        {
          sala: salaId,
          data_ora: startUTC,
          data_ora_fine: endUTC,
          utente: newBooking.utente,
          fornitore: newBooking.fornitore,
          numero_persone: newBooking.numero_persone
        },
      ]);

    if (insertError) {
      setError('Errore nella creazione della prenotazione');
      console.error('Insert error:', insertError);
    } else {
      setShowCreateDialog(false);
    }
    setLoading(false);
  };

  const handleEventClick = (info: any) => {
    const event = events.find((e) => e.id === info.event.id);
    if (event) {
      setSelectedEvent({
        ...event,
        utente: event.extendedProps.utente,
        fornitore: event.extendedProps.fornitore,
        numero_persone: event.extendedProps.numero_persone
      });
      setEditBooking({
        utente: event.extendedProps.utente,
        fornitore: event.extendedProps.fornitore,
        numero_persone: event.extendedProps.numero_persone,
        start: event.start,
        end: event.end || ''
      });
      setShowModal(true);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setError(null);

    setEvents(prevEvents => prevEvents.filter(event => event.id !== selectedEvent.id));

    const { error: deleteError } = await supabase
      .from('prenotazioni')
      .delete()
      .eq('id', selectedEvent.id);

    if (deleteError) {
      setError('Errore durante l\'eliminazione');
      console.error('Delete error:', deleteError);
      setEvents(prevEvents => [...prevEvents, selectedEvent]);
    } else {
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleOpenEditDialog = () => {
    setShowModal(false);
    setShowEditDialog(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setError(null);

    // Converti le date in UTC mantenendo lo stesso orario visualizzato
    const startDate = new Date(editBooking.start);
    const endDate = new Date(editBooking.end);
    
    // Aggiungi l'offset del fuso orario per mantenere lo stesso orario
    const startUTC = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000).toISOString();
    const endUTC = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000).toISOString();

    const { error: updateError } = await supabase
      .from('prenotazioni')
      .update({
        utente: editBooking.utente,
        fornitore: editBooking.fornitore,
        numero_persone: editBooking.numero_persone,
        data_ora: startUTC,
        data_ora_fine: endUTC || null,
      })
      .eq('id', selectedEvent.id);

    if (updateError) {
      setError('Errore durante l\'aggiornamento');
      console.error('Update error:', updateError);
    } else {
      setShowEditDialog(false);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Calendario: {salaId}          
            <div className="absolute top-6 right-6">
            <Button onClick={() => router.push('/')}>
              Torna alla Home
              <ArrowLeft className="w-4 h-4 ml-2" />
            </Button>
          </div></CardTitle>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="animate-spin" />
              <span>Caricamento in corso...</span>
            </div>
          )}

          <div className="rounded-lg border p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              selectable={true}
              selectMirror={true}
              select={handleDateSelect}
              events={events}
              height="auto"
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              nowIndicator={true}
              allDaySlot={false}
              locale="it"
              timeZone="Europe/Rome"
              eventClick={handleEventClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              eventClassNames="cursor-pointer hover:opacity-90"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Booking Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuova Prenotazione</DialogTitle>
            <DialogDescription>
              Compila i dettagli per la nuova prenotazione
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="utente" className="text-right">
                Nome
              </Label>
              <Input
                id="utente"
                value={newBooking.utente}
                onChange={(e) => setNewBooking({...newBooking, utente: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fornitore" className="text-right">
                Fornitore
              </Label>
              <Input
                id="fornitore"
                value={newBooking.fornitore}
                onChange={(e) => setNewBooking({...newBooking, fornitore: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="numero_persone" className="text-right">
                Numero di persone
              </Label>
              <Input
                id="numero_persone"
                type="number"
                min="1"
                value={newBooking.numero_persone}
                onChange={(e) => setNewBooking({...newBooking, numero_persone: parseInt(e.target.value) || 1})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start" className="text-right">
                Data/Ora Inizio
              </Label>
              <Input
                id="start"
                type="datetime-local"
                value={formatDateTimeForInput(newBooking.start)}
                onChange={(e) => setNewBooking({...newBooking, start: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end" className="text-right">
                Data/Ora Fine
              </Label>
              <Input
                id="end"
                type="datetime-local"
                value={formatDateTimeForInput(newBooking.end)}
                onChange={(e) => setNewBooking({...newBooking, end: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateBooking} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Crea Prenotazione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dettagli Prenotazione</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Nome
              </Label>
              <div className="col-span-3">
                {selectedEvent?.extendedProps?.utente}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Fornitore
              </Label>
              <div className="col-span-3">
                {selectedEvent?.extendedProps?.fornitore}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Numero di persone
              </Label>
              <div className="col-span-3">
                {selectedEvent?.extendedProps?.numero_persone}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Data/Ora Inizio
              </Label>
              <div className="col-span-3">
                {selectedEvent?.start ? new Date(new Date(selectedEvent.start).getTime() + new Date(selectedEvent.start).getTimezoneOffset() * 60000).toLocaleString('it-IT') : ''}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Data/Ora Fine
              </Label>
              <div className="col-span-3">
                {selectedEvent?.end ? new Date(new Date(selectedEvent.end).getTime() + new Date(selectedEvent.end).getTimezoneOffset() * 60000).toLocaleString('it-IT') : 'Non specificata'}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Chiudi
            </Button>
            <Button variant="secondary" onClick={handleOpenEditDialog} disabled={loading}>
              Modifica
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Prenotazione</DialogTitle>
            <DialogDescription>
              Modifica i dettagli della prenotazione
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-utente" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-utente"
                value={editBooking.utente}
                onChange={(e) => setEditBooking({...editBooking, utente: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fornitore" className="text-right">
                Fornitore
              </Label>
              <Input
                id="edit-fornitore"
                value={editBooking.fornitore}
                onChange={(e) => setEditBooking({...editBooking, fornitore: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-numero_persone" className="text-right">
                Numero di persone
              </Label>
              <Input
                id="edit-numero_persone"
                type="number"
                min="1"
                value={editBooking.numero_persone}
                onChange={(e) => setEditBooking({...editBooking, numero_persone: parseInt(e.target.value) || 1})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-start" className="text-right">
                Data/Ora Inizio
              </Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={formatDateTimeForInput(editBooking.start)}
                onChange={(e) => setEditBooking({...editBooking, start: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-end" className="text-right">
                Data/Ora Fine
              </Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={formatDateTimeForInput(editBooking.end)}
                onChange={(e) => setEditBooking({...editBooking, end: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setShowModal(true);
            }}>
              Annulla
            </Button>
            <Button onClick={handleUpdateEvent} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}