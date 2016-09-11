package pl.michalcziomer.quadcopter;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.net.Socket;
import java.util.Scanner;

public class Main {

    private static int quadcopterPort = 9999;
    private static String quadcopterAddress = "127.0.0.1";

    public static void main(String[] args) {
        Socket socket = null;
        PrintStream oStream = null;
        DataInputStream iStream = null;
        Scanner reader = new Scanner(System.in);
        String data, response;

        socket = connect( quadcopterAddress, quadcopterPort );
        log("Connected!");

        try {
            oStream = new PrintStream(socket.getOutputStream());
            iStream = new DataInputStream(socket.getInputStream());

            log( "type and enter to send" );
            while(true)
            {
                say( reader.nextLine(), oStream );
                response = listen( iStream );
                log( "Quadcopter: " + response );
            }

        } catch (IOException e) {
            log( "Couldn't connect. Quadcopter not accesible.");
            e.printStackTrace();
        }
    }

    private static Socket connect(String address, int port){
        Socket socket = null;
        try {
            log("Trying to connect to quadcopter @ " +quadcopterAddress+":"+quadcopterPort);
            socket = new Socket(quadcopterAddress, quadcopterPort);
            log("Segway: connected to " + quadcopterAddress + ":" + quadcopterPort);
            return socket;
        } catch (IOException e) {
            return connect( address, port );
        }
    }

    private static void log(String data) {
        System.out.println(data);
    }

    private static void say(String data, PrintStream oStream) {
        oStream.println( data );
    }

    private static String listen(DataInputStream iStream) throws IOException {
        String response = iStream.readLine();
        return response;
    }
}
