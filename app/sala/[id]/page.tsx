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
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
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

    const { error: insertError } = await supabase
      .from('prenotazioni')
      .insert([
        {
          sala: salaId,
          data_ora: newBooking.start,
          data_ora_fine: newBooking.end,
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

    const { error: updateError } = await supabase
      .from('prenotazioni')
      .update({
        utente: editBooking.utente,
        fornitore: editBooking.fornitore,
        numero_persone: editBooking.numero_persone,
        data_ora: editBooking.start,
        data_ora_fine: editBooking.end || null,
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
    <div className="p-4 md:p-6 w-full max-w-[99vw] mx-auto">
      <Card className="mb-6 w-full">
        <CardHeader className="relative">
          <CardTitle className="text-xl md:text-2xl font-bold">
            Calendario: {salaId}
          </CardTitle>
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <Button 
              onClick={() => router.push('/')}
              size="sm"
              className="flex items-center gap-1"
            >
              <span className="hidden md:inline">Torna alla Home</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
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

          <div className="rounded-lg border p-2 md:p-4 overflow-x-auto">
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
              aspectRatio={1.8}
              contentHeight="auto"
              dayMaxEventRows={3}
              views={{
                timeGridWeek: {
                  dayHeaderFormat: { weekday: 'short', day: 'numeric' }
                },
                dayGridMonth: {
                  dayHeaderFormat: { weekday: 'short' }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Booking Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
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
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="w-full sm:w-auto"
              size="sm"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleCreateBooking} 
              disabled={loading}
              className="w-full sm:w-auto"
              size="sm"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crea Prenotazione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
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
                {selectedEvent?.start ? new Date(selectedEvent.start).toLocaleString('it-IT') : ''}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Data/Ora Fine
              </Label>
              <div className="col-span-3">
                {selectedEvent?.end ? new Date(selectedEvent.end).toLocaleString('it-IT') : 'Non specificata'}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="secondary" 
                onClick={handleOpenEditDialog} 
                disabled={loading}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Modifica'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteEvent} 
                disabled={loading}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Elimina'}
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto"
              size="sm"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
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
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false);
                setShowModal(true);
              }}
              className="w-full sm:w-auto"
              size="sm"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleUpdateEvent} 
              disabled={loading}
              className="w-full sm:w-auto"
              size="sm"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}