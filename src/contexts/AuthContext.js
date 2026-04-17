import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email, password, name, role = 'admin') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName: name });
      
      // Create user document in Firestore
      const userData = {
        name: name,
        email: email,
        role: 'pending', // Todos os novos users começam como pendentes
        phone: '',
        schoolId: '',
        escolasAtribuidas: [],
        gruposAtribuidos: [],
        baseSalary: 0,
        weeklyHours: 40,
        mealAllowance: 0,
        christmasAllowance: 0,
        vacationAllowance: 0,
        nightShiftAllowance: 0,
        socialSecurity: 0,
        otherCosts: 0,
        active: false, // Inactive até ser aprovado
        pendingApproval: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Tentando fazer login com:', { email });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Login bem-sucedido:', { 
        uid: userCredential.user.uid, 
        email: userCredential.user.email 
      });
      return userCredential;
    } catch (error) {
      console.error('❌ AuthContext: Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      throw error;
    }
  };

  const fetchUserData = async (user) => {
    try {
      console.log('📊 AuthContext: Buscando dados do utilizador:', { uid: user.uid, email: user.email });
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('✅ AuthContext: Dados do utilizador encontrados:', { 
          id: user.uid, 
          role: data.role, 
          active: data.active,
          pendingApproval: data.pendingApproval 
        });
        setUserData({ id: user.uid, ...data });
      } else {
        console.log('⚠️ AuthContext: Documento do utilizador não existe, criando pendente');
        // If user document doesn't exist, create a pending one
        const userData = {
          name: user.displayName || 'Utilizador',
          email: user.email,
          role: 'pending',
          phone: '',
          schoolId: '',
          escolasAtribuidas: [],
          gruposAtribuidos: [],
          baseSalary: 0,
          weeklyHours: 40,
          mealAllowance: 0,
          christmasAllowance: 0,
          vacationAllowance: 0,
          nightShiftAllowance: 0,
          socialSecurity: 0,
          otherCosts: 0,
          active: false,
          pendingApproval: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ AuthContext: Documento pendente criado');
        setUserData({ id: user.uid, ...userData });
      }
    } catch (error) {
      console.error('❌ AuthContext: Erro ao buscar dados do utilizador:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 AuthContext: Estado de autenticação mudou:', { 
        hasUser: !!user, 
        uid: user?.uid, 
        email: user?.email 
      });
      if (user) {
        setCurrentUser(user);
        await fetchUserData(user);
      } else {
        console.log('🚪 AuthContext: Utilizador deslogado');
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
