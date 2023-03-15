import { useEffect, useReducer } from 'react';
import { API } from 'aws-amplify';
import { List, Input, Button } from 'antd';
import 'antd/dist/reset.css';
import { v4 as uuid } from 'uuid';
import { listNotes } from './graphql/queries';
import { createNote as CreateNote } from './graphql/mutations';


// Variable object declaration
const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: '', description: '' }
};

// Reducer function
function reducer(state, action) {
  switch(action.type) {
    case 'SET_NOTES':
        return { ...state, notes: action.notes, loading: false };
    case 'ERROR':
        return { ...state, loading: false, error: true };
    default:
        return { ...state };
  };
};

const App = () => {

  // state and dispatch variables created and useReducer called using reducer and initialState passed to it 
  const [state, dispatch] = useReducer(reducer, initialState)

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

  // eseEffect hook exececutes when the page first loads and sets to an empty array
  useEffect(() => {
    fetchNotes()
  }, []);

  // variable for styling
  const styles = {
    container: {padding: 20},
    input: {marginBottom: 10},
    item: { textAlign: 'left' },
    p: { color: '#1890ff' }
  }

  // function calls every single item in the list
  function renderItem(item) {
      return (
        <List.Item style={styles.item}>
          <List.Item.Meta
            title={item.name}
            description={item.description}
          />
        </List.Item>
      )
    };


  return (
    <div style={styles.container}>
    <List
      loading={state.loading}
      dataSource={state.notes}
      renderItem={renderItem}
    />
  </div>
  );
}

export default App;
