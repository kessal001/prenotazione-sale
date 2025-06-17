'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import supabase from '../../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface Prenotazione {
  id: string;
  sala: string;
  data_ora: string;
  data_ora_fine?: string;
  utente: string;
  fornitore: string;
}

export default function SalaPage() {
  const { id } = useParams();
  const salaId = decodeURIComponent(id as string);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          title: `${p.utente} - ${p.fornitore}`,
          start: p.data_ora,
          end: p.data_ora_fine || undefined,
          allDay: false,
          extendedProps: {
            utente: p.utente,
            fornitore: p.fornitore,
            sala: p.sala
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
          
          // Handle DELETE events
          if (payload.eventType === 'DELETE') {
            setEvents(prevEvents => prevEvents.filter(event => event.id !== payload.old.id));
            return;
          }
          
          // Handle INSERT/UPDATE events
          if (payload.new.sala === salaId) {
            if (payload.eventType === 'INSERT') {
              setEvents(prevEvents => [
                ...prevEvents,
                {
                  id: payload.new.id,
                  title: `${payload.new.utente} - ${payload.new.fornitore}`,
                  start: payload.new.data_ora,
                  end: payload.new.data_ora_fine || undefined,
                  allDay: false,
                  extendedProps: {
                    utente: payload.new.utente,
                    fornitore: payload.new.fornitore,
                    sala: payload.new.sala
                  }
                }
              ]);
            } else if (payload.eventType === 'UPDATE') {
              setEvents(prevEvents =>
                prevEvents.map(event =>
                  event.id === payload.new.id
                    ? { 
                        ...event,
                        title: `${payload.new.utente} - ${payload.new.fornitore}`,
                        start: payload.new.data_ora,
                        end: payload.new.data_ora_fine || undefined,
                        extendedProps: {
                          utente: payload.new.utente,
                          fornitore: payload.new.fornitore,
                          sala: payload.new.sala
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

  const handleDateSelect = async (selectInfo: any) => {
    const utente = prompt('Nome utente:');
    const fornitore = prompt('Nome fornitore:');
    if (!utente || !fornitore) return;

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('prenotazioni')
      .insert([
        {
          sala: salaId,
          data_ora: selectInfo.startStr,
          data_ora_fine: selectInfo.endStr,
          utente,
          fornitore,
        },
      ]);

    if (insertError) {
      setError('Errore nella creazione della prenotazione');
      console.error('Insert error:', insertError);
    }
    setLoading(false);
  };

  const handleEventClick = (info: any) => {
    const event = events.find((e) => e.id === info.event.id);
    if (event) {
      setSelectedEvent({
        ...event,
        utente: event.extendedProps.utente,
        fornitore: event.extendedProps.fornitore
      });
      setShowModal(true);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setError(null);

    // Optimistic UI update
    setEvents(prevEvents => prevEvents.filter(event => event.id !== selectedEvent.id));

    const { error: deleteError } = await supabase
      .from('prenotazioni')
      .delete()
      .eq('id', selectedEvent.id);

    if (deleteError) {
      setError('Errore durante l\'eliminazione');
      console.error('Delete error:', deleteError);
      // Revert optimistic update if there's an error
      setEvents(prevEvents => [...prevEvents, selectedEvent]);
    } else {
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    const utente = prompt('Nome utente:', selectedEvent.extendedProps.utente);
    const fornitore = prompt('Nome fornitore:', selectedEvent.extendedProps.fornitore);
    const dataOra = prompt('Data e Ora Inizio:', selectedEvent.start);
    const dataOraFine = prompt('Data e Ora Fine:', selectedEvent.end || '');

    if (!utente || !fornitore || !dataOra) return;

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('prenotazioni')
      .update({
        utente,
        fornitore,
        data_ora: dataOra,
        data_ora_fine: dataOraFine || null,
      })
      .eq('id', selectedEvent.id);

    if (updateError) {
      setError('Errore durante l\'aggiornamento');
      console.error('Update error:', updateError);
    } else {
      setShowModal(false);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendario: {salaId}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          Caricamento in corso...
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable={true}
        select={handleDateSelect}
        events={events}
        height="auto"
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        nowIndicator={true}
        allDaySlot={false}
        locale="it"
        timeZone="UTC"
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
      />

      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-10">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-4">Dettagli Prenotazione</h2>
            <p><strong>Utente:</strong> {selectedEvent.extendedProps.utente}</p>
            <p><strong>Fornitore:</strong> {selectedEvent.extendedProps.fornitore}</p>
            <p><strong>Data e Ora Inizio:</strong> {new Date(selectedEvent.start).toLocaleString()}</p>
            <p><strong>Data e Ora Fine:</strong> {selectedEvent.end ? new Date(selectedEvent.end).toLocaleString() : 'Non specificata'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleUpdateEvent}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Caricamento...' : 'Modifica Prenotazione'}
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={loading}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-300"
              >
                {loading ? 'Caricamento...' : 'Elimina Prenotazione'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:bg-gray-300"
              >
                Chiudi
              </button>
            </div>
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}