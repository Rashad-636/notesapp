import { useEffect, useReducer } from 'react';
import { API } from 'aws-amplify';
import { List, Input, Button } from 'antd';
import 'antd/dist/reset.css';
import { v4 as uuid } from 'uuid';
import { listNotes } from './graphql/queries';
import { 
  createNote as CreateNote,
  deleteNote as DeleteNote, 
  updateNote as UpdateNote
} from './graphql/mutations';
import { onCreateNote } from './graphql/subscriptions';

// Variable declariaiton
const CLIENT_ID = uuid();

// Variable object declaration
const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: '', description: '' },
  important: false
};

// Reducer function
function reducer(state, action) {
  switch(action.type) {
    case 'SET_NOTES':
        return { ...state, notes: action.notes, loading: false };
    case 'ADD_NOTE':
        return { ...state, notes: [action.note, ...state.notes]};
    case 'RESET_FORM':
        return { ...state, form: initialState.form };
    case 'SET_INPUT':
        return { ...state, form: { ...state.form, [action.name]: action.value }};
    case 'ADD_EXCLAMATION':
        return { ...state, notes: action.notes, loading:false, important: true}
    case 'ERROR':
        return { ...state, loading: false, error: true };
    default:
        return { ...state };
  };
};

const App = () => {

  // state and dispatch variables created and useReducer called using reducer and initialState passed to it 
  const [state, dispatch] = useReducer(reducer, initialState);

  // fetch notes function created that will call the AppSync API and set the notes array once the APY call is successful 
  const fetchNotes = async() => {
    try {
      const notesData = await API.graphql({
        query: listNotes
      })
      dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items })
    } catch (err) {
      console.log('error: ', err)
      dispatch({ type: 'ERROR' })
    }
  };

  // Create new note
  const createNote = async() => {
    const { form } = state; // destructuring - form element out of state

    if (!form.name || !form.description) {
       return alert('please enter a name and description')
    };
    
    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() };
    dispatch({ type: 'ADD_NOTE', note });
    dispatch({ type: 'RESET_FORM' });

    try {
      await API.graphql({
        query: CreateNote,
        variables: { input: note }
      });
      console.log('successfully created note!')
    } catch (err) {
      console.error("error: ", err)
    };
  };

  // Delete Note 
  const deleteNote = async({ id }) => {
    const index = state.notes.findIndex(n => n.id === id)
    const notes = [
      ...state.notes.slice(0, index), // filter?
      ...state.notes.slice(index + 1)];
    dispatch({ type: 'SET_NOTES', notes })
    try {
      await API.graphql({
        query: DeleteNote,
        variables: { input: { id } }
      })
      console.log('successfully deleted note!')
      } catch (err) {
        console.error(err)
    }
  };

  // Update Note  
  const updateNote = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].completed = !note.completed
    dispatch({ type: 'SET_NOTES', notes})
    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed } }
      })
      console.log('note successfully updated!')
    } catch (err) {
      console.error(err)
    }
  };

  const onChange = (e) => {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value });
  };

  // useEffect hook executes when the page first loads and sets to an empty array
  useEffect(() => {
    fetchNotes()
    const subscription = API.graphql({
      query: onCreateNote
    })
      .subscribe({
        next: noteData => {
          const note = noteData.value.data.onCreateNote
          if (CLIENT_ID === note.clientId) return
          dispatch({ type: 'ADD_NOTE', note })
        }
      })
      return () => subscription.unsubscribe();
  }, []);

  // variable for styling
  const styles = {
    container: {padding: 20},
    input: {marginBottom: 10},
    item: { textAlign: 'left' },
    p: { color: '#1890ff' }
  };

  // Completed notes tracker variables
  const completedNotes = state.notes.filter(x => x.completed).length;
  const totalNotes = state.notes.length

  // function calls every single item in the list
  function renderItem(item) {
    
    //Mark note important (!) 
    const makeImportant = () => {
      const index = state.notes.findIndex(n => n.id === item.id)
      const notes = [...state.notes]
      const importantNote = {...item, name: item.name + '!!'};
      notes[index] = importantNote;
      dispatch({ type: 'ADD_EXCLAMATION', notes})
   };

      return (
        <List.Item 
          style={styles.item}
          actions={[
            <p style={styles.p} onClick={() => deleteNote(item)}>Delete</p>
            ,<p style={styles.p} onClick={() => updateNote(item)}>
              {item.completed ? 'completed' : 'mark completed'}
            </p>
            , <Button onClick={makeImportant}>!</Button>
          ]}>
          <List.Item.Meta
            title={item.name}
            description={item.description}
          />
        </List.Item>
      );
    };

  return (
    <div style={styles.container}>
        <Input
            onChange={onChange}
            value={state.form.name}
            placeholder="Note Name"
            name='name'
            style={styles.input}
        />
        <Input
            onChange={onChange}
            value={state.form.description}
            placeholder="Note description"
            name='description'
            style={styles.input}
        />
        <Button
            onClick={createNote}
            type="primary"
        >Create Note</Button>
      <List
          loading={state.loading}
          dataSource={state.notes}
          renderItem={renderItem}
      />

    <h2>{completedNotes} / {totalNotes} completed</h2>
  </div>
  );
};

export default App;
